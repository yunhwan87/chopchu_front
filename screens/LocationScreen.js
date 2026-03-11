import React, { useCallback, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { LocationManager } from "../components/LocationManager";
import { useLocations } from "../src/hooks/useLocations";
import { useAuth } from "../src/hooks/useAuth";
import { supabase } from "../src/lib/supabase";
import { toKoreanErrorMessage } from "../src/utils/errorMessages";

export const LocationScreen = ({
  project,
  locations,
  setLocations,
  schedule,
  setSchedule,
  currentUserName,
}) => {
  const { user } = useAuth();
  const {
    locations: dbLocations,
    loading,
    error,
    fetchLocations,
    addLocation,
    updateLocation,
    removeLocation,
  } = useLocations(project?.id);

  useEffect(() => {
    if (project?.id) {
      fetchLocations();
    }
  }, [project?.id, fetchLocations]);

  const parseShootingTime = (shootingTime) => {
    if (!shootingTime) return { startTime: "", endTime: "" };
    if (!shootingTime.includes("~")) {
      return { startTime: String(shootingTime).trim(), endTime: "" };
    }
    const [start, end] = String(shootingTime).split("~");
    return {
      startTime: String(start || "").trim(),
      endTime: String(end || "").trim(),
    };
  };

  const mapDbStatusToUiStatus = (status, cardStatus) => {
    if (status === "confirmed") return "확정";
    if (status === "hold") return "보류";
    if (status === "canceled") return "취소";
    if (cardStatus === "coordinator_pending") return "코디 답변대기중";
    if (cardStatus === "crew_pending") return "제작진 답변 대기중";
    if (cardStatus === "pending") return "섭외지 답변 대기중";
    return "요청중";
  };

  const mapUiStatusToDb = (status) => {
    if (status === "확정")
      return { status: "confirmed", card_status: "pending" };
    if (status === "보류") return { status: "hold", card_status: "pending" };
    if (status === "취소")
      return { status: "canceled", card_status: "pending" };
    if (status === "코디 답변대기중") {
      return { status: "requested", card_status: "coordinator_pending" };
    }
    if (status === "제작진 답변 대기중") {
      return { status: "requested", card_status: "crew_pending" };
    }
    if (status === "섭외지 답변 대기중") {
      return { status: "requested", card_status: "pending" };
    }
    return { status: "requested", card_status: "pending" };
  };

  const normalizeThreads = (threads = []) => {
    if (!Array.isArray(threads)) return [];
    return threads
      .map((thread, threadIndex) => {
        const text = String(thread?.text || "").trim();
        if (!text) return null;
        const replies = Array.isArray(thread?.replies)
          ? thread.replies
            .map((reply, replyIndex) => {
              const replyText = String(reply?.text || "").trim();
              if (!replyText) return null;
              return {
                id:
                  reply?.id ||
                  `rp-${Date.now()}-${threadIndex}-${replyIndex}`,
                author: String(reply?.author || "댓글"),
                text: replyText,
              };
            })
            .filter(Boolean)
          : [];

        return {
          id: thread?.id || `rq-${Date.now()}-${threadIndex}`,
          author: String(thread?.author || "요청"),
          text,
          replies,
        };
      })
      .filter(Boolean);
  };

  const serializeRequestsToContent = (requests) => {
    const normalized = normalizeThreads(requests);
    if (normalized.length === 0) return "";
    return JSON.stringify({
      format: "location_threads_v1",
      threads: normalized,
    });
  };

  const parseContentToRequests = (content, locationId) => {
    if (content === null || content === undefined) return [];

    let parsedContent = null;
    if (Array.isArray(content) || typeof content === "object") {
      parsedContent = content;
    } else {
      const raw = String(content).trim();
      if (!raw) return [];
      try {
        parsedContent = JSON.parse(raw);
      } catch (_error) {
        return [
          {
            id: `rq-${locationId}`,
            author: "요청",
            text: raw,
            replies: [],
          },
        ];
      }
    }

    const threads = Array.isArray(parsedContent)
      ? parsedContent
      : Array.isArray(parsedContent?.threads)
        ? parsedContent.threads
        : [];

    const normalized = normalizeThreads(threads);
    if (normalized.length > 0) return normalized;

    const fallbackText = String(content).trim();
    if (!fallbackText) return [];
    return [
      {
        id: `rq-${locationId}`,
        author: "요청",
        text: fallbackText,
        replies: [],
      },
    ];
  };

  const mapDbLocationToUi = useCallback((item) => {
    const { startTime, endTime } = parseShootingTime(item.shooting_time);
    const managerFromPoc =
      Array.isArray(item.locations_poc) && item.locations_poc.length > 0
        ? String(item.locations_poc[0]?.name || "").trim()
        : "";
    const fallbackDate = String(project?.startDate || "").trim();
    const defaultRequests = parseContentToRequests(item.content, item.id);

    return {
      id: item.id,
      // Legacy rows may have empty location_date; fall back to project start date for visibility.
      date: item.location_date || fallbackDate || "",
      name: item.title || "",
      manager: managerFromPoc,
      startTime,
      endTime,
      cost: item.cost,
      depositPaid: Boolean(item.deposit_status),
      risk: item.risk || "",
      memo: item.note || "",
      requests: defaultRequests,
      status: mapDbStatusToUiStatus(item.status, item.card_status),
    };
  }, [project?.startDate]);

  const uiLocations = useMemo(
    () => dbLocations.map((item) => mapDbLocationToUi(item)),
    [dbLocations, mapDbLocationToUi],
  );

  const mapUiLocationToDbPayload = (item) => {
    const shooting_time =
      item.startTime && item.endTime
        ? `${item.startTime}~${item.endTime}`
        : item.startTime || item.endTime || "";

    const mappedStatus = mapUiStatusToDb(item.status);
    const requestContent = serializeRequestsToContent(item.requests);

    return {
      title: item.name || "",
      location_date: item.date || null,
      shooting_time,
      cost:
        item.cost === null ||
          item.cost === undefined ||
          Number.isNaN(Number(item.cost))
          ? 0
          : Number(item.cost),
      deposit_status: Boolean(item.depositPaid),
      deposit_amount: 0,
      note: item.memo || "",
      content: requestContent,
      ...mappedStatus,
    };
  };

  const buildPocsFromUi = (item) => {
    const manager = String(item.manager || "").trim();
    if (!manager) return [];
    return [{ name: manager, phone: "", email: "" }];
  };

  const syncLocationThreadsToRequests = useCallback(
    async (locationId, threads) => {
      if (!project?.id || !user?.id || !locationId) return;

      const tagPrefix = `[LOC_THREAD:${locationId}]`;
      const normalized = normalizeThreads(threads);

      const { data: existingRequests, error: existingError } = await supabase
        .from("requests")
        .select("id")
        .eq("project_id", project.id)
        .eq("sender_id", user.id)
        .eq("receiver_id", user.id)
        .ilike("title", `${tagPrefix}%`);
      if (existingError) throw existingError;

      const existingIds = (existingRequests || []).map((item) => item.id);
      if (existingIds.length > 0) {
        const { error: deleteMessageError } = await supabase
          .from("request_messages")
          .delete()
          .in("request_id", existingIds);
        if (deleteMessageError) throw deleteMessageError;

        const { error: deleteRequestError } = await supabase
          .from("requests")
          .delete()
          .in("id", existingIds);
        if (deleteRequestError) throw deleteRequestError;
      }

      for (let index = 0; index < normalized.length; index += 1) {
        const thread = normalized[index];
        const title = `${tagPrefix}#${index + 1}`;

        const { data: createdRequest, error: createRequestError } =
          await supabase
            .from("requests")
            .insert({
              project_id: project.id,
              sender_id: user.id,
              receiver_id: user.id,
              title,
              status: "resolved",
            })
            .select("id")
            .single();
        if (createRequestError) throw createRequestError;

        const messagePayload = [
          { author: thread.author || "요청", text: thread.text, type: "root" },
          ...(thread.replies || []).map((reply) => ({
            author: reply.author || "댓글",
            text: reply.text,
            type: "reply",
          })),
        ].map((message) => ({
          request_id: createdRequest.id,
          sender_id: user.id,
          content: JSON.stringify(message),
        }));

        if (messagePayload.length > 0) {
          const { error: insertMessageError } = await supabase
            .from("request_messages")
            .insert(messagePayload);
          if (insertMessageError) throw insertMessageError;
        }
      }
    },
    [project?.id, user?.id],
  );

  const handleCreateLocation = useCallback(
    async (uiItem) => {
      const payload = mapUiLocationToDbPayload(uiItem);
      const result = await addLocation(payload, buildPocsFromUi(uiItem));
      if (!result.success) {
        throw new Error(toKoreanErrorMessage(result.error, "장소 생성에 실패했어요."));
      }
      await syncLocationThreadsToRequests(
        result.data?.id,
        uiItem.requests || [],
      );
      return mapDbLocationToUi(result.data);
    },
    [addLocation, mapDbLocationToUi, syncLocationThreadsToRequests],
  );

  const handleUpdateLocation = useCallback(
    async (locationId, uiItem) => {
      const payload = mapUiLocationToDbPayload(uiItem);
      const result = await updateLocation(
        locationId,
        payload,
        buildPocsFromUi(uiItem),
      );
      if (!result.success) {
        throw new Error(toKoreanErrorMessage(result.error, "장소 수정에 실패했어요."));
      }
      await syncLocationThreadsToRequests(locationId, uiItem.requests || []);
      return mapDbLocationToUi(result.data);
    },
    [updateLocation, mapDbLocationToUi, syncLocationThreadsToRequests],
  );

  const handleDeleteLocation = useCallback(
    async (locationId) => {
      const result = await removeLocation(locationId);
      if (!result.success) {
        throw new Error(toKoreanErrorMessage(result.error, "장소 삭제에 실패했어요."));
      }
    },
    [removeLocation],
  );

  return (
    <View style={styles.container}>

      {loading && uiLocations.length === 0 ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
      ) : null}
      {error ? <Text style={styles.errorText}>오류: {toKoreanErrorMessage(error, "장소 데이터를 불러오지 못했어요.")}</Text> : null}

      <LocationManager
        project={project}
        locations={project?.id ? uiLocations : locations}
        setLocations={setLocations}
        schedule={schedule}
        setSchedule={setSchedule}
        currentUserName={currentUserName}
        onCreateLocation={handleCreateLocation}
        onUpdateLocation={handleUpdateLocation}
        onDeleteLocation={handleDeleteLocation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    marginTop: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  description: {
    fontSize: 14,
    color: "#64748B",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    marginHorizontal: 20,
    marginBottom: 8,
  },
});

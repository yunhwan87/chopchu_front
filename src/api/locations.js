import { supabase } from '../lib/supabase';

/**
 * 특정 프로젝트의 장소 목록 가져오기
 */
export const getLocations = async (projectId) => {
    const { data, error } = await supabase
        .from('locations')
        .select(`
      *,
      locations_poc (*)
    `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

/**
 * 장소 상세 정보 및 담당자(POC) 목록 가져오기
 */
export const getLocationDetails = async (locationId) => {
    const { data, error } = await supabase
        .from('locations')
        .select(`
      *,
      locations_poc (*)
    `)
        .eq('id', locationId)
        .single();

    if (error) throw error;
    return data;
};

/**
 * 새 장소 생성
 */
export const createLocation = async (locationData, pucs = []) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data: location, error: locationError } = await supabase
        .from('locations')
        .insert([{ ...locationData, sender_id: user.id }])
        .select()
        .single();

    if (locationError) throw locationError;

    if (pucs.length > 0) {
        const pocData = pucs.map(p => ({
            ...p,
            location_id: location.id
        }));

        const { error: pocError } = await supabase
            .from('locations_poc')
            .insert(pocData);

        if (pocError) {
            console.error('Error adding POCs:', pocError);
        }
    }

    return location;
};

/**
 * 장소 정보 업데이트
 */
export const updateLocation = async (locationId, updateData, pocs) => {
    const { data: updatedLocation, error } = await supabase
        .from('locations')
        .update(updateData)
        .eq('id', locationId)
        .select()
        .single();

    if (error) throw error;

    if (Array.isArray(pocs)) {
        const { error: deleteError } = await supabase
            .from('locations_poc')
            .delete()
            .eq('location_id', locationId);

        if (deleteError) throw deleteError;

        if (pocs.length > 0) {
            const pocData = pocs.map((p) => ({
                ...p,
                location_id: locationId,
            }));

            const { error: insertError } = await supabase
                .from('locations_poc')
                .insert(pocData);

            if (insertError) throw insertError;
        }
    }

    const { data: detail, error: detailError } = await supabase
        .from('locations')
        .select(`
      *,
      locations_poc (*)
    `)
        .eq('id', locationId)
        .single();

    if (detailError) throw detailError;
    return detail || updatedLocation;
};

/**
 * 장소 삭제
 */
export const deleteLocation = async (locationId) => {
    const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId);

    if (error) throw error;
    return true;
};

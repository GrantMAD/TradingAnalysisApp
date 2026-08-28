import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '../../../../../lib/supabase/server';

const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: analysisId } = await params;
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .select('id, user_id, status')
    .eq('id', analysisId)
    .single();

  if (analysisError || !analysis) return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  if (analysis.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (analysis.status !== 'completed') {
    return NextResponse.json({ error: 'Only completed analyses can have chart snapshots.' }, { status: 409 });
  }

  const formData = await request.formData();
  const image = formData.get('image');
  if (!(image instanceof File)) return NextResponse.json({ error: 'Snapshot image is required.' }, { status: 400 });
  if (image.type !== 'image/png') return NextResponse.json({ error: 'Snapshot must be a PNG image.' }, { status: 400 });
  if (image.size === 0 || image.size > MAX_SNAPSHOT_BYTES) {
    return NextResponse.json({ error: 'Snapshot must be between 1 byte and 5MB.' }, { status: 400 });
  }

  const storagePath = `${user.id}/${analysisId}/analysis-chart.png`;
  const admin = await createAdminClient();
  const { error: uploadError } = await admin.storage
    .from('chart-screenshots')
    .upload(storagePath, await image.arrayBuffer(), { contentType: 'image/png', upsert: true });

  if (uploadError) {
    console.error('[Snapshot API] Upload failed:', uploadError.message);
    return NextResponse.json({ error: 'Could not save the chart snapshot.' }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from('analyses')
    .update({ generated_chart_path: storagePath })
    .eq('id', analysisId)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('[Snapshot API] Association failed:', updateError.message);
    return NextResponse.json({ error: 'Could not associate the chart snapshot.' }, { status: 500 });
  }

  const { data: existingUpload } = await admin
    .from('screenshot_uploads')
    .select('id')
    .eq('analysis_id', analysisId)
    .eq('storage_path', storagePath)
    .maybeSingle();

  const snapshotUpload = {
    user_id: user.id,
    analysis_id: analysisId,
    storage_path: storagePath,
    original_filename: 'analysis-chart.png',
    mime_type: 'image/png',
    file_size_bytes: image.size,
  };

  const { error: metadataError } = existingUpload
    ? await admin.from('screenshot_uploads').update(snapshotUpload).eq('id', existingUpload.id)
    : await admin.from('screenshot_uploads').insert(snapshotUpload);

  if (metadataError) {
    console.error('[Snapshot API] Metadata association failed:', metadataError.message);
    return NextResponse.json({ error: 'Could not save snapshot metadata.' }, { status: 500 });
  }

  const { data: signed } = await admin.storage
    .from('chart-screenshots')
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json({ path: storagePath, signedUrl: signed?.signedUrl ?? null });
}

import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { LaterScreen } from '@/features/desk/LaterScreen';
import { useDeskLink } from '@/features/desk/useDeskLink';
import { DocumentViewer } from '@/components/desk/DocumentViewer';

export default function FileScreen() {
  const params = useLocalSearchParams<{ projectId: string; path: string }>(); const link = useDeskLink();
  const enabled = !!link.calls && typeof params.projectId === 'string' && typeof params.path === 'string';
  const query = useQuery({ queryKey: ['desk-document', link.ownerId, link.info?.id, params.projectId, params.path], queryFn: () => link.calls!.document({ projectId: params.projectId, path: params.path }), enabled, retry: false, gcTime: 0 });
  return <LaterScreen name="file" overline="project file" title={params.path?.split('/').pop() || 'file'} sub={params.path || ''} sampleOnly={false} waitsOn="">
    {query.data && enabled ? <DocumentViewer key={query.data.path} file={query.data} /> : <Text className="font-sans text-sm text-muted-foreground">{query.error ? String(query.error) : enabled ? 'Reading the exact project file…' : 'Connect directly to the paired PC to read this file.'}</Text>}
  </LaterScreen>;
}

import RemotePhoto from './RemotePhoto';
export default function ReportPreviewPhoto({ report, getPhotoUrl }) {
  return <RemotePhoto path={report?.photo_paths?.[0]} getUrl={getPhotoUrl} label={report?.title || 'Report photo'} style={{ width: 76, height: 86, borderRadius: 12, backgroundColor: '#EDF2EE' }} />;
}

import { useRoute } from './lib/router';
import { Dashboard } from './dashboard/Dashboard';
import { Editor } from './editor/Editor';
import { Preview } from './preview/Preview';
import { DialogHost } from './components/Dialogs';

export function App() {
  const route = useRoute();
  return (
    <>
      {route.name === 'editor' ? (
        <Editor key={route.siteId} siteId={route.siteId} />
      ) : route.name === 'preview' ? (
        <Preview siteId={route.siteId} pageId={route.pageId} />
      ) : (
        <Dashboard />
      )}
      <DialogHost />
    </>
  );
}

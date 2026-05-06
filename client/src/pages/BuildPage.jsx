import BuildView from '../components/builds/BuildView.jsx';

export default function BuildPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-neutral-50 px-8 pt-8 pb-16 font-sans">
      <BuildView />
    </main>
  );
}

import PublishForm from '../components/builds/PublishForm.jsx';

export default function PublishPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-neutral-950 text-neutral-50 px-8 pt-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 border-b border-neutral-800 pb-5">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Publish <span className="text-teal-400">Build Guide</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Add your guide, video, and timestamps — then share it with the community.
          </p>
        </header>
        <PublishForm />
      </div>
    </main>
  );
}

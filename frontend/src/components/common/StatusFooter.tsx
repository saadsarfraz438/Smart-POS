import { BRANCH_NAME, TERMINAL_ID } from '../../utils/constants';

/* FR-4.3: terminal, branch, animated connection state */
export default function StatusFooter({ online, latency, branch = BRANCH_NAME }: { online: boolean; latency: number | null; branch?: string }) {
  return (
    <footer className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-mute">
      <span>Terminal {TERMINAL_ID}</span>
      <span>{branch}</span>
      <span role="status" className="flex items-center gap-1.5">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${online ? 'bg-ok animate-pulse motion-reduce:animate-none' : 'bg-err'}`} />
        {online ? `Online${latency ? ` - Latency: ${latency}ms` : ''}` : 'Offline - Local Vault Active'}
      </span>
    </footer>
  );
}

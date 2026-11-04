const KEYS = ['1', '2', '3', '⌫', '4', '5', '6', '0', '7', '8', '9', 'C'];

export default function Numpad({ onPress, disabled }: { onPress: (k: string) => void; disabled?: boolean }) {
  return (
    <div role="group" aria-label="Onscreen numpad" className="my-4 grid grid-cols-4 gap-2.5">
      {KEYS.map((k) => (
        <button key={k} type="button" className="v-key" disabled={disabled} onClick={() => onPress(k)}
          aria-label={k === '⌫' ? 'Backspace' : k === 'C' ? 'Clear' : k}>{k}</button>
      ))}
    </div>
  );
}

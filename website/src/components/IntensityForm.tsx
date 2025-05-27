// components/IntensityForm.tsx
interface IntensityFormProps {
    selectedCoords: [number, number];
    intensityInput: string;
    onChange: (val: string) => void;
    onAdd: () => void;
    onCancel: () => void;
  }
  
  export default function IntensityForm({
    selectedCoords,
    intensityInput,
    onChange,
    onAdd,
    onCancel,
  }: IntensityFormProps) {
    return (
      <section className="max-w-md mx-auto bg-zinc-900 p-6 rounded-xl shadow-lg mb-24">
        <h3 className="text-xl font-bold mb-4 text-center">Novo ponto selecionado</h3>
        <p className="mb-4 text-center">
          Latitude: {selectedCoords[0].toFixed(6)}, Longitude: {selectedCoords[1].toFixed(6)}
        </p>
        <input
          type="number"
          placeholder="Intensidade (0 a 10)"
          min={0}
          max={10}
          className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          value={intensityInput}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex justify-center gap-4">
          <button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700 transition rounded px-6 py-3 font-semibold">
            Adicionar Ponto
          </button>
          <button onClick={onCancel} className="bg-zinc-700 hover:bg-zinc-800 transition rounded px-6 py-3 font-semibold">
            Cancelar
          </button>
        </div>
      </section>
    );
  }
  
// components/IntensityForm.tsx
interface IntensityFormProps {
  selectedCoords: [number, number];
  onAdd: () => void;
  onCancel: () => void;
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  uploading: boolean;
}

export default function IntensityForm({
  selectedCoords,
  onAdd,
  onCancel,
  imageFile,
  setImageFile,
  uploading,
}: IntensityFormProps) {
  return (
    <>
      {/* Fundo escuro para dar foco ao modal */}
      <div
        className="fixed inset-0 bg-black/50 z-[49]"
        onClick={onCancel}
      />

      {/* Formulário flutuante centralizado */}
      <div className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-zinc-800 border border-zinc-700 p-6 rounded-xl shadow-2xl w-[90vw] max-w-md">
        <h3 className="text-white text-lg font-semibold mb-2">Adicionar ponto</h3>

        <p className="text-sm text-zinc-400 mb-4">
          Lat: {selectedCoords[0].toFixed(4)}, Lng: {selectedCoords[1].toFixed(4)}
        </p>

        <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 mb-4 rounded bg-zinc-700 hover:bg-zinc-600 text-white transition">
          <span className="text-xl">📷</span>
          <span>{imageFile ? "Imagem selecionada" : "Escolher imagem"}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
        </label>

        {imageFile && (
          <p className="text-xs text-green-400 mb-3">
            Imagem selecionada: {imageFile.name}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={uploading}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onAdd}
            disabled={uploading || !imageFile}
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50 transition"
          >
            {uploading ? "Enviando..." : "Adicionar"}
          </button>
        </div>
      </div>
    </>
  );
}

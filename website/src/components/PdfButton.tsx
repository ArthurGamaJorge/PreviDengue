"use client";

import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ReportDocument } from '@/lib/pdfGenerator';

// --- INTERFACES ---
interface PrioritizedAddress {
    name: string;
    coords: string;
    risk_level: 'Alto' | 'Médio' | 'Baixo';
    main_risk_factor: string;
}

interface PdfGeneratorProps {
    municipalityName: string;
    addresses: PrioritizedAddress[];
}

// 1. IMPORTAÇÃO DINÂMICA DO COMPONENTE DA BIBLIOTECA
// Isso garante que o código de '@react-pdf/renderer' nunca seja incluído no bundle do servidor.
const DynamicPDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
    {
        ssr: false, // Garante que não renderize no servidor
        loading: () => (
            // Mostra um botão de carregamento enquanto a biblioteca é baixada no cliente
            <button
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-zinc-500 text-white font-semibold rounded-md cursor-wait"
                disabled
            >
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando PDF...
            </button>
        )
    }
);

export const PdfButton = ({ municipalityName, addresses }: PdfGeneratorProps) => {
    // 2. O documento é criado aqui para manter a lógica encapsulada.
    const pdfDocument = <ReportDocument municipalityName={municipalityName} addresses={addresses} />;

    // 3. Usa o componente importado dinamicamente
    return (
        <DynamicPDFDownloadLink
            document={pdfDocument}
            fileName={`relatorio_fiscalizacao_${municipalityName.replace(/\s/g, '_')}.pdf`}
        >
            {({ loading }) => (
                <button
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-600 text-white font-semibold rounded-md transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || addresses.length === 0}
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                    {loading ? 'Gerando...' : 'Baixar Relatório'}
                </button>
            )}
        </DynamicPDFDownloadLink>
    );
};
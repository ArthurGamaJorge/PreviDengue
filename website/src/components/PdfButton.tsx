"use client";

import React from 'react';
import { PDFDownloadLink, DocumentProps } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import { ReportDocument } from '@/lib/pdfGenerator';

// Definição das interfaces
interface PrioritizedAddress {
    name: string;
    coords: string;
    risk_level: 'Alto' | 'Médio' | 'Baixo';
    main_risk_factor: string;
}

// A interface agora usa DocumentProps para tipar a propriedade 'document'
interface PdfGeneratorProps {
    municipalityName: string;
    addresses: PrioritizedAddress[];
    document: React.ReactElement<DocumentProps>;
}

export const PdfButton = ({ municipalityName, addresses, document }: PdfGeneratorProps) => {
    return (
        <PDFDownloadLink
            document={document}
            fileName={`relatorio_fiscalizacao_${municipalityName.replace(/\s/g, '_')}.pdf`}
        >
            {({ loading }) => (
                <button
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-600 text-white font-semibold rounded-md transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || addresses.length === 0}
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                    {loading ? 'Gerando...' : 'Baixar Relatório em PDF'}
                </button>
            )}
        </PDFDownloadLink>
    );
};
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        color: '#212121',
        padding: 40,
        fontFamily: 'Helvetica',
    },
    headerSection: {
        marginBottom: 30,
        paddingBottom: 10,
        borderBottom: '2px solid #EEEEEE',
        textAlign: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A73E8',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: '#616161',
    },
    contentSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#424242',
        marginBottom: 10,
        borderBottom: '1px solid #E0E0E0',
        paddingBottom: 5,
    },
    infoText: {
        fontSize: 12,
        marginBottom: 15,
        color: '#424242',
        lineHeight: 1.5,
    },
    listItem: {
        marginBottom: 15,
        border: '1px solid #E0E0E0',
        padding: 10,
        borderRadius: 5,
    },
    riskContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    riskDot: {
        width: 8,
        height: 8,
        // CORREÇÃO: Usar um valor numérico em vez de '50%'
        borderRadius: 4, 
        marginRight: 8,
    },
    riskText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    detailsText: {
        fontSize: 10,
        color: '#757575',
        marginLeft: 16,
        marginTop: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 9,
        color: '#9E9E9E',
    }
});

interface PrioritizedAddress {
    name: string;
    coords: string;
    risk_level: 'Alto' | 'Médio' | 'Baixo';
    main_risk_factor: string;
}

interface ReportDocumentProps {
    municipalityName: string;
    addresses: PrioritizedAddress[];
}

const getRiskColor = (risk: PrioritizedAddress['risk_level']) => {
    switch(risk) {
        case 'Alto': return '#F44336';
        case 'Médio': return '#FF9800';
        case 'Baixo': return '#4CAF50';
        default: return '#9E9E9E';
    }
};

export const ReportDocument = ({ municipalityName, addresses }: ReportDocumentProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={styles.headerSection}>
                <Text style={styles.title}>Relatório de Fiscalização</Text>
                <Text style={styles.subtitle}>Análise de Risco de Dengue para {municipalityName}</Text>
                <Text style={styles.subtitle}>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</Text>
            </View>

            <View style={styles.contentSection}>
                <Text style={styles.sectionTitle}>Locais Prioritários para Inspeção</Text>
                <Text style={styles.infoText}>
                    A lista abaixo contém os locais com maior risco de foco, identificados pela inteligência artificial. Priorize as áreas com nível de risco "Alto".
                </Text>
                
                {addresses.length === 0 ? (
                    <Text style={{ ...styles.infoText, textAlign: 'center' }}>
                        Nenhum local de alto risco foi identificado no momento.
                    </Text>
                ) : (
                    addresses.map((addr, index) => (
                        <View key={index} style={styles.listItem}>
                            <View style={styles.riskContainer}>
                                <View style={[styles.riskDot, { backgroundColor: getRiskColor(addr.risk_level) }]} />
                                <Text style={styles.riskText}>{index + 1}. {addr.name}</Text>
                            </View>
                            <Text style={styles.detailsText}>Coordenadas: {addr.coords}</Text>
                        </View>
                    ))
                )}
            </View>

            <Text style={styles.footer} fixed>
                - Relatório gerado por PreviDengue -
            </Text>
        </Page>
    </Document>
);
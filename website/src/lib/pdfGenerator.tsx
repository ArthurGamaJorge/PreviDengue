import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Link, Image } from '@react-pdf/renderer';

// Importa a imagem do ícone do Maps (você precisará de um ícone base64 ou de uma URL)
const mapsIconBase64 = "data:image/png;base64,..."; // Substitua por seu próprio ícone.

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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    riskInfo: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    riskContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
    },
    riskDot: {
        width: 8,
        height: 8,
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
        marginTop: 4,
    },
    linkButton: {
        width: 20,
        height: 20,
        marginLeft: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 9,
        color: '#9E9E9E',
    },
    mainMapButton: {
        backgroundColor: '#007BFF',
        color: '#FFFFFF',
        padding: 10,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 12,
        textDecoration: 'none',
        marginBottom: 20,
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
    switch (risk) {
        case 'Alto': return '#F44336';
        case 'Médio': return '#FF9800';
        case 'Baixo': return '#4CAF50';
        default: return '#9E9E9E';
    }
};

// --- Funções de Cálculo e Ordenação ---

// Função para calcular a distância euclidiana entre dois pontos
const calculateDistance = (coord1: string, coord2: string) => {
    const [lat1, lng1] = coord1.split(', ').map(s => parseFloat(s.replace(/[^0-9.-]/g, '')));
    const [lat2, lng2] = coord2.split(', ').map(s => parseFloat(s.replace(/[^0-9.-]/g, '')));
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
};

// Algoritmo do Vizinho Mais Próximo para otimização total
const getOptimizedRoute = (addresses: PrioritizedAddress[]) => {
    if (addresses.length <= 1) {
        return addresses;
    }

    const startPoint = addresses.find(addr => addr.risk_level === 'Alto') || addresses[0];
    const unvisited = [...addresses].filter(addr => addr !== startPoint);
    const route = [startPoint];
    let currentPoint = startPoint;

    while (unvisited.length > 0) {
        let nearestIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
            const distance = calculateDistance(currentPoint.coords, unvisited[i].coords);
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = i;
            }
        }
        currentPoint = unvisited.splice(nearestIndex, 1)[0];
        route.push(currentPoint);
    }
    return route;
};

// Função para gerar o link do Google Maps para uma rota com múltiplos pontos
const generateGoogleMapsRouteLink = (addresses: PrioritizedAddress[]) => {
    if (addresses.length === 0) return '#';
    
    const coordsString = addresses.map(addr => {
        const [lat, lng] = addr.coords.replace('Lat: ', '').replace('Lng: ', '').split(', ');
        return `${lat},${lng}`;
    }).join('/');

    return `https://www.google.com/maps/dir/${coordsString}`;
};

export const ReportDocument = ({ municipalityName, addresses }: ReportDocumentProps) => {
    const finalOptimizedAddresses = getOptimizedRoute(addresses);
    const allCoordinatesLink = generateGoogleMapsRouteLink(finalOptimizedAddresses);

    return (
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
                        A lista abaixo contém os locais com maior risco de foco, identificados pela inteligência artificial. A rota foi otimizada para minimizar a distância percorrida.
                    </Text>

                    {finalOptimizedAddresses.length > 0 && (
                        <Link src={allCoordinatesLink} style={styles.mainMapButton}>
                            Ver Rota Completa no Maps
                        </Link>
                    )}

                    {finalOptimizedAddresses.length === 0 ? (
                        <Text style={{ ...styles.infoText, textAlign: 'center' }}>
                            Nenhum local de risco foi identificado com os filtros atuais.
                        </Text>
                    ) : (
                        finalOptimizedAddresses.map((addr, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={styles.riskInfo}>
                                    <View style={styles.riskContainer}>
                                        <View style={[styles.riskDot, { backgroundColor: getRiskColor(addr.risk_level) }]} />
                                        <Text style={styles.riskText}>{addr.name}</Text>
                                    </View>
                                    <Text style={styles.detailsText}>Coordenadas: {addr.coords}</Text>
                                </View>
                                <Link src={`https://www.google.com/maps/search/?api=1&query=${addr.coords.replace('Lat: ', '').replace('Lng: ', '')}`}>
                                    <Image src={mapsIconBase64} style={styles.linkButton} />
                                </Link>
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
};
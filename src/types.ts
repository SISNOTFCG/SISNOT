export type InspectionType = 'NOTIFICAÇÃO' | 'AUTO DE INFRAÇÃO' | 'INTERDIÇÃO';

export interface CompanyData {
  name: string;
  cnpj: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  address: string;
  phone: string;
  occupation: string[];
  pscip: string;
  accompaniedBy: string;
  accompaniedByCPF: string;
  accompaniedByFunction: string;
}

export interface ResponsibleData {
  name: string;
  email: string;
  cpf: string;
}

export interface WitnessData {
  name: string;
  role: string;
  cpf: string;
  rg: string;
}

export interface InspectorData {
  name: string;
  rank: string;
  registration: string;
}

export interface SignaturesData {
  responsible: string;
  inspectors: string[];
}

export interface InspectionData {
  date: string;
  type: InspectionType;
  unit: string;
  preNumber: string;
  notificationNumber: string;
  deadlineDays: number;
  company: CompanyData;
  irregularities: string[];
  responsible: ResponsibleData;
  witness: WitnessData;
  inspectors: InspectorData[];
  signatures: SignaturesData;
}

export const GBM_OPTIONS = [
  "1º GBM (METROPOLITANO SUL)",
  "2º GBM (GRANDE DOURADOS)",
  "3º GBM (PANTANAL)",
  "4º GBM (SUL-FRONTEIRA)",
  "5º GBM (BOLSÃO)",
  "6º GBM",
  "7º GBM",
  "8º GBM",
  "9º GBM",
  "10º GBM",
  "DAT (DIRETORIA DE ATIVIDADES TÉCNICAS)"
];

export const GBM_FOOTERS: Record<string, string> = {
  "1º GBM (METROPOLITANO SUL)": "Avenida Costa e Silva, 901 – Vila Progresso, Campo Grande – MS. Contato: 3314-5878",
  "2º GBM (GRANDE DOURADOS)": "Avenida Presidente Vargas, 1167, Vila Progresso, Dourados-MS. Contato: (67) 3421-4442/3422-7400.",
  "3º GBM (PANTANAL)": "Av. Rio Branco, 1.611 – Bairro Universitário, Corumbá-MS. Contato: (67) 3231-9593 ou 3231-2444",
  "4º GBM (SUL-FRONTEIRA)": "Av. Brasil, 950 – Bairro da Granja, Ponta Porã - MS. Contato: (67) 3437-0104",
  "5º GBM (BOLSÃO)": "Av. Filinto Muller, 3.300 – Jd. Morumbi, Três Lagoas-MS. Contato: (67) 3509-7800",
  "6º GBM": "Avenida do Poeta, 70, Parque dos Poderes, Campo Grande-MS. Contato: (67) 99941-7334",
  "7º GBM": "Rua João Martins Paniagua, s/n – Jd. Aeroporto, Jardim-MS. Contato: (67) 3251-2326",
  "8º GBM": "Rua Imaculada Conceição, 1.678 – Bairro Guiomar Soares de Andrade, Nova Andradina-MS. Contato: (067) 3441-6804 / 3441-1922",
  "9º GBM": "Av. Otacílio Severo dos Santos, 385 – Vl. Santo André, Coxim-MS. Contato: (67) 3908-6000",
  "10º GBM": "Avenida Amambaí, 850, Centro, Naviraí-MS. Contato: (67) 3461-3514/ 3461-3209.",
  "DAT (DIRETORIA DE ATIVIDADES TÉCNICAS)": "Rua Fernando Augusto Corrêa da Costa, 376, Jardim América, Campo Grande-MS. Contato (67)3357-9419 / (67) 99987-9882"
};

export const IRREGULARITIES_LIST = [
  "Apresentar ART/RRT das instalações elétricas de baixa tensão com atestado de conformidade",
  "Apresentar ART/RRT das medidas preventivas contra incêndio e pânico",
  "Apresentar ART/RRT dos equipamentos de vaso pressão",
  "Apresentar ART/RRT geradores",
  "Apresentar ART/RRT manutenção e funcionamento do sistema de despoeiramento e explosão",
  "Apresentar ART/RRT sistema SPDA",
  "Apresentar ART/RRT tratamento antichamas CMAR",
  "Apresentar ART/RRT manutenção sistema de refrigeração com uso de amônia",
  "Apresentar ART/RRT selagem de shaft's",
  "Apresentar Atestado de Brigada",
  "Apresentar Nota Fiscal de Recarga de extintores",
  "Realizar instalação de extintores de incêndio conforme NT-21",
  "Realizar instalação de iluminação de emergência conforme NT -18",
  "Realizar instalação de sinalização de emergência conforme NT- 20",
  "Apresentar processo de regularização junto ao sistema PREVENIR",
  "Apresentar PSCIP do local",
  "Realizar ATUALIZAÇÃO / SUBSTITUIÇÃO do PSCIP"
];

export const INSPECTOR_RANKS = [
  "Soldado",
  "Cabo",
  "3º Sargento",
  "2º Sargento",
  "1º Sargento",
  "Subtenente",
  "2º Tenente",
  "1º Tenente",
  "Capitão",
  "Major",
  "Tenente-Coronel",
  "Coronel"
];

export const OCCUPATIONS_LIST = [
  "A-1 Habitação unifamiliar",
  "A-2 Habitação multifamiliar",
  "A-3 Habitação coletiva",
  "B-1 Hotel e assemelhado",
  "B-2 Hotel residencial",
  "C-1 Comércio com baixa carga de incêndio",
  "C-2 Comércio com média e alta carga de incêndio",
  "C-3 Shoppings centers",
  "D-1 Local para prestação de serviço profissional ou condução de negócios",
  "D-2 Agência bancária",
  "D-3 Serviço de reparação (exceto os classificados em G-4)",
  "D-4 Laboratório",
  "E-1 Escola em geral",
  "E-2 Escola especial",
  "E-3 Espaço para cultura física",
  "E-4 Centro de treinamento profissional",
  "E-5 Pré-escola",
  "E-6 Escola para portadores de deficiência",
  "F-1 Local onde há objeto de valor inestimável",
  "F-2 Local religioso e velório",
  "F-3 Centro esportivo e de exibição",
  "F-4 Estação e terminal de passageiro",
  "F-5 Arte cênica e auditório",
  "F-6 Clubes sociais e diversão",
  "F-7 Construção provisória",
  "F-8 Local para refeição",
  "F-9 Recreação pública",
  "F-10 Exposição de objetos e animais",
  "G-1 Garagem sem acesso de público e sem abastecimento",
  "G-2 Garagem com acesso de público e sem abastecimento",
  "G-3 Local dotado de abastecimento de combustível",
  "G-4 Serviço de conservação, manutenção e reparos",
  "G-5 Hangares",
  "H-1 Hospital veterinário e assemelhados",
  "H-2 Local onde pessoas requerem cuidados especiais por limitações físicas ou mentais",
  "H-3 Hospital e assemelhado",
  "H-4 Edificações das forças armadas e policiais",
  "H-5 Local onde a liberdade das pessoas sofre restrições",
  "H-6 Clínica e consultório médico e odontológico",
  "I-1 Locais com baixo potencial de incêndio (Carga < 300 MJ/m²)",
  "I-2 Locais com médio potencial de incêndio (Carga entre 300 a 1.200 MJ/m²)",
  "I-3 Locais com alto risco de incêndio (Carga > 1.200 MJ/m²)",
  "J-1 Depósitos de material incombustível",
  "J-2 Todo tipo de Depósito",
  "J-3 Todo tipo de Depósito",
  "J-4 Todo tipo de Depósito",
  "L-1 Comércio",
  "L-2 Indústria",
  "L-3 Depósito",
  "M-1 Túnel",
  "M-2 Líquido ou gás inflamável ou combustíveis",
  "M-3 Central de comunicação e energia",
  "M-4 Propriedade em transformação",
  "M-5 Silos",
  "M-6 Terra selvagem",
  "M-7 Pátio de Contêineres"
];

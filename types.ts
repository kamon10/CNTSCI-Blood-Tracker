
export interface DistributionData {
  id?: string;
  horodateur: string;
  nomAgent: string;
  dateDistribution: string;
  centreCntsci: string;
  nbCgrAdulte: number;
  nbCgrPediatrique: number;
  nbPlasma: number;
  nbPlaquettes: number;
  nbStructuresSanitaire: number;
}

export const CNTSCI_CENTERS = [
  'CRTS TREICHVILLE', 'CDTS BINGERVILLE', 'SP PORT BOUET', 'SP ABOBO BAOULE',
  'SP ANYAMA', 'SP YOPOUGON ATTIE', 'SP CHU COCODY', 'SP YOPOUGON CHU',
  'CDTS ABOISSO', 'CDTS BONOUA', 'CDTS ADZOPE', 'CDTS AGBOVILLE', 'CDTS DABOU',
  'CRTS YAMOUSSOUKRO', 'CDTS TOUMODI', 'CDTS GAGNOA', 'CDTS DIVO', 'CDTS DIMBOKRO',
  'CRTS BOUAKE', 'CRTS KORHOGO', 'CDTS FERKE', 'CRTS ABENGOUROU', 'CDTS DAOUKRO',
  'CDTS BONGOUANOU', 'CDTS BONDOUKOU', 'CDTS BOUNA', 'CRTS DALOA', 'CDTS SEGUELA',
  'CRTS SAN-PEDRO', 'CDTS DUEKOUE', 'CCRTS MAN', 'CDTS ODIENNE', 'CDTS BOUAFLE'
];

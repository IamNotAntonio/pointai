// Curated list of undergraduate courses common in Brazilian higher education.
// Source: distilled from INEP/MEC course taxonomies + common variants.
// Matching is case- and accent-insensitive via normalize().

export const CURSOS = [
  // Engenharias
  'Engenharia Civil',
  'Engenharia Mecânica',
  'Engenharia Elétrica',
  'Engenharia Eletrônica',
  'Engenharia Química',
  'Engenharia de Produção',
  'Engenharia de Computação',
  'Engenharia de Software',
  'Engenharia de Controle e Automação',
  'Engenharia Ambiental',
  'Engenharia Sanitária',
  'Engenharia Aeronáutica',
  'Engenharia Aeroespacial',
  'Engenharia Naval',
  'Engenharia de Materiais',
  'Engenharia de Minas',
  'Engenharia Florestal',
  'Engenharia de Petróleo',
  'Engenharia Cartográfica',
  'Engenharia Agrícola',
  'Engenharia de Telecomunicações',
  'Engenharia Mecatrônica',
  'Engenharia de Alimentos',
  'Engenharia Bioquímica',
  'Engenharia Têxtil',
  'Engenharia de Energia',
  'Engenharia Biomédica',
  'Engenharia Hídrica',
  'Engenharia Acústica',
  'Engenharia Agronômica',
  'Engenharia de Pesca',
  'Engenharia Industrial',

  // Saúde
  'Medicina',
  'Medicina Veterinária',
  'Odontologia',
  'Farmácia',
  'Enfermagem',
  'Nutrição',
  'Fisioterapia',
  'Fonoaudiologia',
  'Terapia Ocupacional',
  'Psicologia',
  'Biomedicina',
  'Saúde Coletiva',
  'Educação Física',
  'Estética e Cosmetologia',
  'Gerontologia',
  'Naturologia',
  'Obstetrícia',
  'Quiropraxia',
  'Optometria',
  'Tecnologia em Radiologia',

  // Exatas e Tecnologia
  'Matemática',
  'Matemática Aplicada',
  'Matemática Computacional',
  'Estatística',
  'Física',
  'Física Médica',
  'Química',
  'Biologia',
  'Ciências Biológicas',
  'Ciência da Computação',
  'Ciência de Dados',
  'Sistemas de Informação',
  'Análise e Desenvolvimento de Sistemas',
  'Tecnologia da Informação',
  'Redes de Computadores',
  'Segurança da Informação',
  'Inteligência Artificial',
  'Banco de Dados',
  'Jogos Digitais',
  'Gestão da Tecnologia da Informação',
  'Astronomia',
  'Meteorologia',
  'Geologia',
  'Geofísica',
  'Oceanografia',
  'Geociências',

  // Humanas
  'História',
  'Geografia',
  'Filosofia',
  'Sociologia',
  'Antropologia',
  'Ciências Sociais',
  'Ciência Política',
  'Letras',
  'Letras - Português',
  'Letras - Inglês',
  'Letras - Espanhol',
  'Letras - Francês',
  'Letras - Libras',
  'Linguística',
  'Pedagogia',
  'Serviço Social',
  'Teologia',
  'Tradução',
  'Biblioteconomia',
  'Museologia',
  'Arqueologia',
  'Arquivologia',
  'Educação Especial',
  'Educação do Campo',

  // Sociais Aplicadas
  'Administração',
  'Administração Pública',
  'Ciências Contábeis',
  'Ciências Econômicas',
  'Economia',
  'Direito',
  'Relações Internacionais',
  'Comércio Exterior',
  'Logística',
  'Gestão de Recursos Humanos',
  'Gestão Pública',
  'Gestão Financeira',
  'Gestão Comercial',
  'Gestão Empresarial',
  'Gestão de Negócios',
  'Gestão de Marketing',
  'Secretariado Executivo',
  'Processos Gerenciais',
  'Ciências Atuariais',
  'Ciências Aeronáuticas',

  // Comunicação e Design
  'Comunicação Social',
  'Jornalismo',
  'Publicidade e Propaganda',
  'Relações Públicas',
  'Marketing',
  'Cinema e Audiovisual',
  'Rádio e TV',
  'Design',
  'Design Gráfico',
  'Design de Moda',
  'Design de Interiores',
  'Design de Produto',
  'Design Digital',
  'Moda',

  // Arquitetura
  'Arquitetura e Urbanismo',
  'Urbanismo',
  'Paisagismo',

  // Artes
  'Artes Visuais',
  'Artes Cênicas',
  'Música',
  'Dança',
  'Teatro',
  'Composição Musical',
  'Regência',
  'Canto',
  'Conservação e Restauro',
  'História da Arte',

  // Hospitalidade
  'Hotelaria',
  'Turismo',
  'Gastronomia',
  'Eventos',

  // Agrárias
  'Agronomia',
  'Zootecnia',
  'Aquicultura',

  // Licenciaturas
  'Licenciatura em Matemática',
  'Licenciatura em Física',
  'Licenciatura em Química',
  'Licenciatura em Biologia',
  'Licenciatura em História',
  'Licenciatura em Geografia',
  'Licenciatura em Letras',
  'Licenciatura em Educação Física',
  'Licenciatura em Artes',
]

function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function cursoReconhecido(input) {
  if (!input) return false
  const n = normalize(input)
  if (n.length < 2) return false
  return CURSOS.some(c => normalize(c) === n)
}

export function filtrarCursos(input, limit = 8) {
  if (!input) return []
  const n = normalize(input)
  if (n.length < 1) return []
  const startsWith = []
  const includes = []
  for (const c of CURSOS) {
    const cn = normalize(c)
    if (cn === n) continue
    if (cn.startsWith(n)) startsWith.push(c)
    else if (cn.includes(n)) includes.push(c)
  }
  return [...startsWith, ...includes].slice(0, limit)
}

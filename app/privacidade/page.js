'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const SECTIONS = [
  { id: 'quem-somos',       title: 'Quem Somos' },
  { id: 'dados-coletados',  title: 'Dados Coletados' },
  { id: 'finalidade',       title: 'Finalidade do Tratamento' },
  { id: 'protecao',         title: 'Como Protegemos seus Dados' },
  { id: 'compartilhamento', title: 'Compartilhamento de Dados' },
  { id: 'cookies',          title: 'Cookies e Analytics' },
  { id: 'retencao',         title: 'Retenção de Dados' },
  { id: 'direitos',         title: 'Seus Direitos (LGPD)' },
  { id: 'dpo',              title: 'Encarregado de Dados' },
  { id: 'alteracoes',       title: 'Alterações desta Política' },
]

export default function Privacidade() {
  const [active, setActive] = useState('quem-somos')

  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: '-30% 0px -60% 0px' }
    )
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c0c', color: '#f4f4f5', fontFamily: 'var(--font-geist-sans,system-ui,sans-serif)', WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        .legal-h2{font-size:22px;font-weight:800;color:#f4f4f5;letter-spacing:-.5px;margin-bottom:16px;padding-top:64px}
        .legal-h3{font-size:15px;font-weight:700;color:#e4e4e7;margin:20px 0 8px}
        .legal-p{font-size:14.5px;color:#a1a1aa;line-height:1.8;margin-bottom:12px}
        .legal-ul{margin:10px 0 14px 0;display:flex;flex-direction:column;gap:6px}
        .legal-li{font-size:14.5px;color:#a1a1aa;line-height:1.7;display:flex;gap:10px;align-items:flex-start}
        .legal-li::before{content:'';width:5px;height:5px;border-radius:50%;background:#1a7a4a;flex-shrink:0;margin-top:8px}
        .legal-tag{display:inline-block;background:rgba(26,122,74,.1);border:1px solid rgba(34,197,94,.2);color:#86efac;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px}
        .legal-box{background:#0f0f0f;border:1px solid #1a1a1a;border-radius:12px;padding:18px 20px;margin:14px 0}
        .nav-item{display:block;padding:7px 12px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;text-align:left;width:100%;font-family:inherit;transition:all .15s;color:#71717a}
        .nav-item:hover{color:#a1a1aa;background:#ffffff06}
        .nav-item.active{color:#22c55e;background:rgba(26,122,74,.1)}
        @media(max-width:768px){.legal-sidebar{display:none!important}.legal-layout{padding:0 16px!important}}
      `}</style>

      {/* Top bar */}
      <div style={{ background: '#0c0c0c', borderBottom: '1px solid #141414', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#71717a', fontSize: 13.5, fontWeight: 500, textDecoration: 'none', transition: 'color .15s' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar para o Point.AI
        </Link>
        <span style={{ color: '#1e1e1e', fontSize: 18 }}>|</span>
        <span style={{ fontSize: 13.5, color: '#3f3f46', fontWeight: 500 }}>Política de Privacidade</span>
      </div>

      <div className="legal-layout" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 60, alignItems: 'start' }}>

        {/* Sidebar */}
        <aside className="legal-sidebar" style={{ position: 'sticky', top: 80, padding: '40px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: '#3f3f46', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 12 }}>Seções</p>
          {SECTIONS.map(s => (
            <button key={s.id} className={`nav-item ${active === s.id ? 'active' : ''}`} onClick={() => scrollTo(s.id)}>
              {s.title}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main style={{ padding: '40px 0 80px' }}>
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>Privacidade</p>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f4f4f5', letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 14 }}>Política de Privacidade</h1>
            <p style={{ fontSize: 14.5, color: '#71717a', lineHeight: 1.7 }}>
              Esta política descreve como o Point.AI coleta, usa e protege suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados — <strong style={{ color: '#a1a1aa' }}>LGPD (Lei nº 13.709/2018)</strong>.
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span className="legal-tag">Última atualização: Maio 2026</span>
              <span className="legal-tag">LGPD Conforme</span>
            </div>
          </div>

          {/* 1 */}
          <section id="quem-somos">
            <h2 className="legal-h2">1. Quem Somos</h2>
            <p className="legal-p">
              O <strong style={{ color: '#e4e4e7' }}>Point.AI</strong> é uma plataforma de assistência acadêmica com inteligência artificial, desenvolvida para universitários brasileiros. Nosso objetivo é personalizar o aprendizado com base no perfil de cada estudante.
            </p>
            <div className="legal-box">
              <h3 className="legal-h3" style={{ marginTop: 0 }}>Como nos contatar</h3>
              <p className="legal-p" style={{ marginBottom: 4 }}>E-mail: <a href="mailto:privacidade@pointai.com.br" style={{ color: '#22c55e', textDecoration: 'none' }}>privacidade@pointai.com.br</a></p>
              <p className="legal-p" style={{ marginBottom: 0 }}>Para exercer seus direitos como titular, use o mesmo e-mail com o assunto "LGPD — [tipo de solicitação]".</p>
            </div>
          </section>

          {/* 2 */}
          <section id="dados-coletados">
            <h2 className="legal-h2">2. Dados Coletados</h2>
            <p className="legal-p">Coletamos apenas os dados necessários para prestar o serviço de assistência acadêmica personalizada:</p>

            <h3 className="legal-h3">Dados fornecidos pelo usuário</h3>
            <ul className="legal-ul">
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Nome</strong> — para personalizar as interações</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Curso e universidade</strong> — para contextualizar as respostas da IA</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Semestre e matérias</strong> — para personalizar o conteúdo</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Objetivo acadêmico</strong> — para direcionar o foco do assistente</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Notas e frequência</strong> — inseridas manualmente pelo usuário</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Eventos do calendário</strong> — inseridos ou importados do portal acadêmico</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Histórico de conversas</strong> — para manter o contexto entre sessões</li>
            </ul>

            <h3 className="legal-h3">Dados coletados automaticamente via Google OAuth</h3>
            <ul className="legal-ul">
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Endereço de e-mail Google</strong> — usado como identificador único da conta</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Nome do perfil Google</strong> — importado como nome padrão, alterável pelo usuário</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Token de autenticação</strong> — gerenciado pelo Supabase Auth, não acessado diretamente</li>
            </ul>

            <h3 className="legal-h3">Dados técnicos</h3>
            <ul className="legal-ul">
              <li className="legal-li">Logs de acesso (IP, user-agent, timestamps) — retidos por até 30 dias para segurança</li>
              <li className="legal-li">Dados de uso anônimos via analytics — sem vinculação a identidade pessoal</li>
            </ul>
          </section>

          {/* 3 */}
          <section id="finalidade">
            <h2 className="legal-h2">3. Finalidade do Tratamento</h2>
            <p className="legal-p">Tratamos seus dados com base nas seguintes bases legais da LGPD:</p>
            <ul className="legal-ul">
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Execução de contrato (art. 7º, V):</strong> personalizar o assistente de IA com seu perfil acadêmico, manter histórico de conversas, calcular médias e alertas de faltas</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Legítimo interesse (art. 7º, IX):</strong> melhorar a qualidade das respostas e detectar problemas técnicos</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Consentimento (art. 7º, I):</strong> envio de comunicações opcionais sobre novidades do serviço</li>
            </ul>
            <div className="legal-box">
              <p className="legal-p" style={{ marginBottom: 0 }}>
                <strong style={{ color: '#86efac' }}>Importante:</strong> Seus dados acadêmicos nunca são usados para treinar modelos de IA externos. O conteúdo das suas conversas é enviado à API da Anthropic apenas para processar a resposta em tempo real, não para treinamento.
              </p>
            </div>
          </section>

          {/* 4 */}
          <section id="protecao">
            <h2 className="legal-h2">4. Como Protegemos seus Dados</h2>
            <ul className="legal-ul">
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Armazenamento seguro:</strong> todos os dados são armazenados no Supabase (PostgreSQL) com criptografia em repouso (AES-256) e em trânsito (TLS 1.3)</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Autenticação OAuth:</strong> não armazenamos senhas — o acesso é feito exclusivamente via Google OAuth 2.0</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Row Level Security (RLS):</strong> cada usuário acessa exclusivamente seus próprios dados no banco de dados — isolamento garantido a nível de banco</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Zero venda de dados:</strong> seus dados nunca são vendidos, alugados ou compartilhados com terceiros para fins comerciais</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Acesso mínimo:</strong> apenas sistemas essenciais ao funcionamento do serviço acessam seus dados</li>
            </ul>
          </section>

          {/* 5 */}
          <section id="compartilhamento">
            <h2 className="legal-h2">5. Compartilhamento de Dados</h2>
            <p className="legal-p">Compartilhamos dados apenas com os provedores técnicos estritamente necessários:</p>
            <ul className="legal-ul">
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Supabase:</strong> banco de dados e autenticação — hospedagem em servidores na América do Sul</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Anthropic (Claude API):</strong> processamento das mensagens enviadas ao assistente — sem armazenamento permanente pela Anthropic conforme seus termos comerciais</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Mercado Pago:</strong> processamento de pagamentos — dados financeiros são tratados exclusivamente por eles, não armazenamos dados de cartão</li>
            </ul>
            <p className="legal-p">Não compartilhamos dados com órgãos governamentais, exceto mediante ordem judicial.</p>
          </section>

          {/* 6 */}
          <section id="cookies">
            <h2 className="legal-h2">6. Cookies e Analytics</h2>
            <h3 className="legal-h3">Cookies essenciais</h3>
            <p className="legal-p">Utilizamos cookies de sessão para manter você autenticado. Esses cookies são estritamente necessários e não podem ser desativados sem comprometer o funcionamento do serviço.</p>
            <h3 className="legal-h3">Analytics anônimo</h3>
            <p className="legal-p">Podemos utilizar ferramentas de analytics que coletam dados agregados e anonimizados (como número de sessões, páginas visitadas, tempo no site). Esses dados não são vinculados à sua identidade pessoal.</p>
            <h3 className="legal-h3">Local Storage</h3>
            <p className="legal-p">O app utiliza o armazenamento local do seu navegador (localStorage) como cache para melhorar a performance. Esses dados permanecem no seu dispositivo e podem ser apagados limpando os dados do navegador.</p>
          </section>

          {/* 7 */}
          <section id="retencao">
            <h2 className="legal-h2">7. Retenção de Dados</h2>
            <ul className="legal-ul">
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Dados de perfil e histórico:</strong> retidos enquanto a conta estiver ativa</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Após cancelamento:</strong> dados são anonimizados em até 30 dias e excluídos permanentemente em até 90 dias, salvo obrigação legal</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Logs de acesso:</strong> retidos por 30 dias para segurança e diagnóstico técnico</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Dados financeiros:</strong> retidos pelo período exigido pela legislação fiscal brasileira (5 anos)</li>
            </ul>
          </section>

          {/* 8 */}
          <section id="direitos">
            <h2 className="legal-h2">8. Seus Direitos como Titular (LGPD)</h2>
            <p className="legal-p">Nos termos do art. 18 da LGPD, você tem os seguintes direitos:</p>
            <ul className="legal-ul">
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Confirmação e acesso:</strong> saber se tratamos seus dados e obter uma cópia</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Anonimização ou exclusão:</strong> solicitar que dados desnecessários sejam anonimizados ou excluídos</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Portabilidade:</strong> receber seus dados em formato estruturado para transferência a outro serviço</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Revogação do consentimento:</strong> retirar consentimento a qualquer momento para tratamentos baseados nessa base legal</li>
              <li className="legal-li"><strong style={{ color: '#e4e4e7' }}>Oposição:</strong> se opor a tratamentos que não estejam em conformidade com a lei</li>
            </ul>
            <div className="legal-box">
              <p className="legal-p" style={{ marginBottom: 0 }}>Para exercer qualquer desses direitos, envie um e-mail para <a href="mailto:privacidade@pointai.com.br" style={{ color: '#22c55e', textDecoration: 'none' }}>privacidade@pointai.com.br</a> com o assunto <strong style={{ color: '#e4e4e7' }}>"LGPD — [tipo de solicitação]"</strong>. Responderemos em até 15 dias úteis.</p>
            </div>
          </section>

          {/* 9 */}
          <section id="dpo">
            <h2 className="legal-h2">9. Encarregado de Dados (DPO)</h2>
            <p className="legal-p">Em cumprimento ao art. 41 da LGPD, designamos um Encarregado pelo Tratamento de Dados Pessoais (DPO):</p>
            <div className="legal-box">
              <p className="legal-p" style={{ marginBottom: 4 }}><strong style={{ color: '#e4e4e7' }}>Contato do DPO:</strong></p>
              <p className="legal-p" style={{ marginBottom: 4 }}>E-mail: <a href="mailto:dpo@pointai.com.br" style={{ color: '#22c55e', textDecoration: 'none' }}>dpo@pointai.com.br</a></p>
              <p className="legal-p" style={{ marginBottom: 0 }}>Você também pode entrar em contato com a Autoridade Nacional de Proteção de Dados (ANPD) em caso de violação dos seus direitos: <a href="https://www.gov.br/anpd" style={{ color: '#22c55e', textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">gov.br/anpd</a></p>
            </div>
          </section>

          {/* 10 */}
          <section id="alteracoes">
            <h2 className="legal-h2">10. Alterações desta Política</h2>
            <p className="legal-p">Podemos atualizar esta Política de Privacidade periodicamente. Quando houver alterações materiais, notificaremos via e-mail ou aviso proeminente no app com pelo menos 15 dias de antecedência.</p>
            <p className="legal-p">O uso continuado do serviço após a vigência das alterações constitui aceitação da nova política.</p>
            <div className="legal-box">
              <p className="legal-p" style={{ marginBottom: 0 }}><strong style={{ color: '#86efac' }}>Versão atual:</strong> 1.0 — Publicada em Maio de 2026.</p>
            </div>
          </section>

          {/* Bottom nav */}
          <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid #141414', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ color: '#71717a', fontSize: 13.5, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, transition: 'color .15s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Voltar para o Point.AI
            </Link>
            <Link href="/termos" style={{ color: '#71717a', fontSize: 13.5, textDecoration: 'none' }}>Ver Termos de Uso</Link>
          </div>
        </main>
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const SECTIONS = [
  { id: 'aceitacao',        title: 'Aceitação dos Termos' },
  { id: 'servico',          title: 'Descrição do Serviço' },
  { id: 'cadastro',         title: 'Cadastro e Conta' },
  { id: 'uso-aceitavel',    title: 'Uso Aceitável' },
  { id: 'pagamentos',       title: 'Planos e Pagamentos' },
  { id: 'propriedade',      title: 'Propriedade Intelectual' },
  { id: 'responsabilidade', title: 'Limitação de Responsabilidade' },
  { id: 'cancelamento',     title: 'Cancelamento' },
  { id: 'alteracoes',       title: 'Alterações nos Termos' },
  { id: 'foro',             title: 'Foro e Legislação' },
]

export default function Termos() {
  const [active, setActive] = useState('aceitacao')

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
          Voltar para o Point
        </Link>
        <span style={{ color: '#1e1e1e', fontSize: 18 }}>|</span>
        <span style={{ fontSize: 13.5, color: '#3f3f46', fontWeight: 500 }}>Termos de Uso</span>
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
            <p style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>Legal</p>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f4f4f5', letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 14 }}>Termos de Uso</h1>
            <p style={{ fontSize: 14.5, color: '#71717a', lineHeight: 1.7 }}>
              Ao utilizar o Point, você concorda com estes Termos de Uso. Leia com atenção antes de criar sua conta.
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span className="legal-tag">Última atualização: Maio 2026</span>
              <span className="legal-tag">Versão 1.0</span>
            </div>
          </div>

          {/* 1 */}
          <section id="aceitacao">
            <h2 className="legal-h2">1. Aceitação dos Termos</h2>
            <p className="legal-p">
              Ao criar uma conta, acessar ou utilizar o <strong style={{ color: '#e4e4e7' }}>Point</strong>, você declara ter lido, compreendido e concordado com estes Termos de Uso e com nossa <Link href="/privacidade" style={{ color: '#22c55e', textDecoration: 'none' }}>Política de Privacidade</Link>.
            </p>
            <p className="legal-p">
              Se você não concordar com qualquer disposição destes termos, não utilize o serviço. O uso continuado após alterações nos termos constitui aceitação das mesmas.
            </p>
            <p className="legal-p">
              Para utilizar o Point, você deve ter pelo menos <strong style={{ color: '#e4e4e7' }}>13 anos de idade</strong>. Usuários menores de 18 anos devem ter autorização dos pais ou responsáveis legais.
            </p>
          </section>

          {/* 2 */}
          <section id="servico">
            <h2 className="legal-h2">2. Descrição do Serviço</h2>
            <p className="legal-p">
              O Point é uma plataforma de assistência acadêmica que utiliza inteligência artificial para ajudar estudantes universitários brasileiros a melhorar seu desempenho acadêmico.
            </p>
            <h3 className="legal-h3">Funcionalidades incluídas</h3>
            <ul className="legal-ul">
              <li className="legal-li">Chat com IA personalizado por matéria e perfil acadêmico</li>
              <li className="legal-li">Controle de notas e frequência com alertas automáticos</li>
              <li className="legal-li">Calendário acadêmico com importação de portais universitários</li>
              <li className="legal-li">Correção e feedback de trabalhos acadêmicos</li>
              <li className="legal-li">Dashboard de evolução com análise de desempenho</li>
              <li className="legal-li">Relatórios semanais com planos de estudo personalizados (planos pagos)</li>
            </ul>
            <div className="legal-box">
              <p className="legal-p" style={{ marginBottom: 0 }}>
                <strong style={{ color: '#86efac' }}>Natureza do serviço:</strong> O Point é uma ferramenta de apoio educacional. As respostas geradas pela IA têm caráter informativo e de suporte ao estudo. Não substituem orientação de professores, tutores especializados ou profissionais da área de saúde, jurídica ou financeira.
              </p>
            </div>
          </section>

          {/* 3 */}
          <section id="cadastro">
            <h2 className="legal-h2">3. Cadastro e Conta</h2>
            <p className="legal-p">O cadastro no Point é feito exclusivamente via Google OAuth. Ao se cadastrar, você:</p>
            <ul className="legal-ul">
              <li className="legal-li">Garante que as informações fornecidas são verídicas e atualizadas</li>
              <li className="legal-li">É responsável por manter a confidencialidade da sua conta Google</li>
              <li className="legal-li">Compromete-se a notificar imediatamente qualquer uso não autorizado da sua conta</li>
              <li className="legal-li">Aceita que uma conta é pessoal e intransferível</li>
            </ul>
            <p className="legal-p">
              Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos, sem aviso prévio em casos graves.
            </p>
          </section>

          {/* 4 */}
          <section id="uso-aceitavel">
            <h2 className="legal-h2">4. Uso Aceitável</h2>
            <p className="legal-p">Ao utilizar o Point, você concorda em não:</p>
            <ul className="legal-ul">
              <li className="legal-li">Utilizar o serviço para cometer plágio ou fraude acadêmica</li>
              <li className="legal-li">Tentar acessar dados de outros usuários</li>
              <li className="legal-li">Realizar engenharia reversa, descompilar ou extrair o código-fonte da plataforma</li>
              <li className="legal-li">Utilizar bots, scripts ou qualquer meio automatizado para acessar o serviço de forma abusiva</li>
              <li className="legal-li">Publicar, transmitir ou armazenar conteúdo ilegal, ofensivo ou que viole direitos de terceiros</li>
              <li className="legal-li">Sobrecarregar intencionalmente a infraestrutura do serviço</li>
              <li className="legal-li">Revender ou sublicenciar o acesso ao serviço</li>
            </ul>
            <h3 className="legal-h3">Uso para fins acadêmicos</h3>
            <p className="legal-p">
              O Point foi desenvolvido para auxiliar no aprendizado. Incentivamos o uso ético: utilize o assistente para entender conceitos, revisar conteúdo e se preparar para avaliações — não para substituir o aprendizado genuíno.
            </p>
          </section>

          {/* 5 */}
          <section id="pagamentos">
            <h2 className="legal-h2">5. Planos e Pagamentos</h2>
            <h3 className="legal-h3">Plano gratuito</h3>
            <p className="legal-p">O Point oferece um plano gratuito com funcionalidades básicas, sem necessidade de cartão de crédito.</p>
            <h3 className="legal-h3">Planos pagos</h3>
            <p className="legal-p">Planos com recursos avançados (como Relatório Semanal Pro) são cobrados mensalmente ou anualmente via Mercado Pago.</p>
            <ul className="legal-ul">
              <li className="legal-li">Os preços são exibidos em reais (BRL) e podem ser alterados com aviso prévio de 30 dias</li>
              <li className="legal-li">A cobrança é automática e recorrente conforme o período escolhido</li>
              <li className="legal-li">Não há reembolso por períodos parciais, exceto nos casos previstos no Código de Defesa do Consumidor</li>
              <li className="legal-li">Direito de arrependimento de 7 dias corridos a partir da contratação, conforme art. 49 do CDC</li>
            </ul>
            <h3 className="legal-h3">Cancelamento de assinatura</h3>
            <p className="legal-p">Você pode cancelar sua assinatura a qualquer momento pelo painel do app. O acesso aos recursos premium permanece até o fim do período já pago.</p>
          </section>

          {/* 6 */}
          <section id="propriedade">
            <h2 className="legal-h2">6. Propriedade Intelectual</h2>
            <p className="legal-p">
              Todo o conteúdo da plataforma Point — incluindo código, design, logotipo, textos e funcionalidades — é de propriedade exclusiva do Point e protegido pela legislação de propriedade intelectual brasileira (Lei nº 9.610/98).
            </p>
            <h3 className="legal-h3">Seus dados e conteúdo</h3>
            <p className="legal-p">
              Você mantém todos os direitos sobre o conteúdo que insere na plataforma (textos de trabalhos, histórico de notas, etc.). Ao utilizar o serviço, você nos concede uma licença limitada para processar esse conteúdo exclusivamente para prestar o serviço contratado.
            </p>
            <div className="legal-box">
              <p className="legal-p" style={{ marginBottom: 0 }}>
                <strong style={{ color: '#86efac' }}>Conteúdo gerado pela IA:</strong> As respostas geradas pelo assistente são fornecidas como suporte educacional. Verifique sempre informações importantes com fontes primárias. O Point não garante a precisão absoluta de todo conteúdo gerado.
              </p>
            </div>
          </section>

          {/* 7 */}
          <section id="responsabilidade">
            <h2 className="legal-h2">7. Limitação de Responsabilidade</h2>
            <p className="legal-p">O Point é fornecido "como está" (as-is), sem garantias expressas ou implícitas de:</p>
            <ul className="legal-ul">
              <li className="legal-li">Disponibilidade ininterrupta do serviço (buscamos 99% de uptime, mas não garantimos)</li>
              <li className="legal-li">Precisão absoluta das respostas da IA em todos os contextos</li>
              <li className="legal-li">Resultados acadêmicos específicos decorrentes do uso da plataforma</li>
            </ul>
            <p className="legal-p">
              Nos termos permitidos pela legislação brasileira, nossa responsabilidade está limitada ao valor pago pelo usuário nos últimos 3 meses de assinatura. Não nos responsabilizamos por danos indiretos, perda de dados por falha do usuário em realizar backup, ou consequências de decisões acadêmicas baseadas no conteúdo gerado pelo assistente.
            </p>
          </section>

          {/* 8 */}
          <section id="cancelamento">
            <h2 className="legal-h2">8. Cancelamento de Conta</h2>
            <h3 className="legal-h3">Cancelamento pelo usuário</h3>
            <p className="legal-p">
              Você pode solicitar a exclusão da sua conta a qualquer momento pelo app ou enviando e-mail para <a href="mailto:privacidade@pointai.com.br" style={{ color: '#22c55e', textDecoration: 'none' }}>privacidade@pointai.com.br</a>. Seus dados serão tratados conforme nossa <Link href="/privacidade" style={{ color: '#22c55e', textDecoration: 'none' }}>Política de Privacidade</Link>.
            </p>
            <h3 className="legal-h3">Cancelamento pelo Point</h3>
            <p className="legal-p">Podemos suspender ou encerrar sua conta caso haja:</p>
            <ul className="legal-ul">
              <li className="legal-li">Violação destes Termos de Uso</li>
              <li className="legal-li">Uso fraudulento ou abusivo do serviço</li>
              <li className="legal-li">Inadimplência após período de carência</li>
              <li className="legal-li">Ordem judicial ou exigência legal</li>
            </ul>
            <p className="legal-p">Em casos não emergenciais, notificaremos com pelo menos 7 dias de antecedência.</p>
          </section>

          {/* 9 */}
          <section id="alteracoes">
            <h2 className="legal-h2">9. Alterações nos Termos</h2>
            <p className="legal-p">
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações materiais serão comunicadas via e-mail ou aviso no app com pelo menos <strong style={{ color: '#e4e4e7' }}>15 dias de antecedência</strong>.
            </p>
            <p className="legal-p">
              Alterações menores (correções gramaticais, clarificações que não modifiquem direitos) podem ser feitas sem notificação prévia. A data de "última atualização" no topo desta página reflete sempre a versão mais recente.
            </p>
          </section>

          {/* 10 */}
          <section id="foro">
            <h2 className="legal-h2">10. Foro e Legislação Aplicável</h2>
            <p className="legal-p">
              Estes Termos de Uso são regidos pela legislação brasileira, especialmente o Código Civil (Lei nº 10.406/2002), o Código de Defesa do Consumidor (Lei nº 8.078/1990) e o Marco Civil da Internet (Lei nº 12.965/2014).
            </p>
            <p className="legal-p">
              Para a resolução de conflitos, fica eleito o foro da comarca de São Paulo/SP, renunciando-se a qualquer outro, por mais privilegiado que seja.
            </p>
            <div className="legal-box">
              <p className="legal-p" style={{ marginBottom: 0 }}>
                Dúvidas sobre estes termos? Entre em contato: <a href="mailto:contato@pointai.com.br" style={{ color: '#22c55e', textDecoration: 'none' }}>contato@pointai.com.br</a>
              </p>
            </div>
          </section>

          {/* Bottom nav */}
          <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid #141414', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ color: '#71717a', fontSize: 13.5, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Voltar para o Point
            </Link>
            <Link href="/privacidade" style={{ color: '#71717a', fontSize: 13.5, textDecoration: 'none' }}>Ver Política de Privacidade</Link>
          </div>
        </main>
      </div>
    </div>
  )
}

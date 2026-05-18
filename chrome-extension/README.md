# Point.AI — Extensão Chrome

Importa suas notas e frequência diretamente do portal da faculdade para o Point.AI.

## Como instalar (Modo Desenvolvedor)

1. **Baixe e extraia** o arquivo `point-extension.zip`

2. **Abra as extensões do Chrome**
   - Digite na barra de endereços: `chrome://extensions`

3. **Ative o Modo do Desenvolvedor**
   - Clique na chave no canto superior direito da página

4. **Carregue a extensão**
   - Clique em **"Carregar sem compactação"**
   - Selecione a pasta `chrome-extension` extraída do ZIP

5. **Pronto!**
   - O ícone Point.AI aparecerá na barra de extensões do Chrome
   - Acesse o portal da sua faculdade — o botão de importação aparece automaticamente

## Portais suportados

A extensão detecta automaticamente portais acadêmicos comuns:

- **SIGA / SIGAA** — USP, UFMG, UFSC e outros
- **Moodle** — AVA de diversas universidades
- **TOTVS / RM** — Anhanguera, Unopar, Kroton
- **Sapiens** — UNIVALI e outros
- **SuaGrade** — plataforma agregadora
- **Qualquer portal** com tabelas de notas e frequência

## Como usar

1. Acesse o portal da sua faculdade e vá até a tela de notas/histórico
2. Clique no botão **"Importar para Point.AI"** (canto inferior direito)
3. O Point.AI abre em nova aba com os dados capturados
4. Confirme a importação na página de Notas e Faltas

## Permissões utilizadas

| Permissão | Motivo |
|-----------|--------|
| `activeTab` | Ler o conteúdo da página atual do portal |
| `storage` | Guardar dados temporários entre a extração e a importação |
| `clipboardWrite` | Copiar dados extraídos para área de transferência |
| `tabs` | Abrir o Point.AI após extração |

## Desenvolvimento

```bash
# Empacotar extensão (gera /public/point-extension.zip)
node scripts/pack-extension.js
```

Para modificar a extensão, edite os arquivos em `/chrome-extension/` e recarregue-a em `chrome://extensions`.

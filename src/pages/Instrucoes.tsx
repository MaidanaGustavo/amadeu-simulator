import { Link } from 'react-router-dom';
import './instrucoes.css';

export default function Instrucoes() {
  return (
    <div className="instrucoes">
      <div className="wrap">
        <nav>
          <Link to="/">← Voltar ao laboratório</Link>
          <Link className="principal" to="/">Abrir a caixa</Link>
        </nav>



<h1>Instruções</h1>
<p className="sub">Como usar o Amodeu Simulator e o que esperar de cada experimento</p>

<p>O Amodeu Simulator simula uma câmara de condicionamento operante — a “caixa de Skinner” — com um rato virtual cujo comportamento é gerado por um modelo matemático de aprendizagem. Você é o experimentador: decide quando entregar comida, que esquema de reforço vigora, quando apresentar som, luz ou choque. O sujeito responde às consequências, não à sua intenção.</p>

<div className="nota">O princípio que rege tudo: <b>o reforço fortalece o que o rato estava fazendo no instante em que o reforço chegou</b>, com efeito decrescente quanto maior o atraso. Se ele levantou perto da barra e a comida caiu dois segundos depois, foi “levantar perto da barra” que ganhou força — e não “pressionar”.</div>

<h2>A cena</h2>
<p>Arraste para girar a câmera, use a roda do mouse (ou pinça no celular) para aproximar, e dê um duplo clique para voltar ao enquadramento padrão. Na parede do fundo fica o painel de interação:</p>
<table>
  <tr><th>Componente</th><th>Função</th></tr>
  <tr><td>Alavanca</td><td>O operando. Cada pressão é registrada e passa pelo esquema de reforço vigente.</td></tr>
  <tr><td>Comedouro</td><td>Recebe a pelota de comida. O clique do dispensador é o som que, por pareamento, vira reforçador condicionado.</td></tr>
  <tr><td>Luz-sinal</td><td>Estímulo visual (CS) para condicionamento clássico. Acende por 5 s.</td></tr>
  <tr><td>Alto-falante</td><td>Estímulo sonoro (CS). Toca por 5 s, ou 10 s nos ensaios automáticos.</td></tr>
  <tr><td>Grade do piso</td><td>Aplica choque breve (US). O rato congela por cerca de 2 s.</td></tr>
  <tr><td>Pelagem</td><td>Cerca de 2 800 fios instanciados sobre corpo e cabeça, penteados para trás, mais textura de relevo gerada em canvas. No celular, 900 fios.</td></tr>
  <tr><td>Luz de teto</td><td>Iluminação geral da câmara (<i>house light</i>), sempre acesa.</td></tr>
</table>

<h2>A HUD</h2>
<ul>
  <li><b>Canto superior esquerdo</b> — o que o rato está fazendo agora e o esquema em vigor.</li>
  <li><b>Topo, ao centro</b> — tempo de sessão, pressões, reforços, taxa por minuto e a razão de supressão do último bloco de ensaios pavlovianos.</li>
  <li><b>Registro cumulativo</b> — a curva sobe uma unidade a cada pressão e volta ao zero ao completar 50. Os traços curtos marcam reforços. Inclinação = taxa. O botão <code>Registro</code> na doca oculta ou mostra o gráfico.</li>
  <li><b>Doca inferior</b> — os cinco atos do experimentador. <kbd>espaço</kbd> entrega comida; <kbd>P</kbd> pausa e retoma; <kbd>M</kbd> silencia; <kbd>G</kbd> gira a caixa.</li>
  <li><b>Áudio</b> — tudo é sintetizado na hora: clique do dispensador e queda da pelota, tom de 2,8 kHz do CS, zumbido do choque, e o rato fareja, mastiga, coça e guincha (mais alto e mais longo sob choque). Os guinchos reais ficam no ultrassom; aqui estão transpostos para a faixa audível, como faria um detector de morcegos. Acima de 20× o áudio é suspenso para não virar ruído.</li>
  <li><b>Câmera</b> — arraste para girar em 360°, inclusive por baixo da grade; roda ou pinça para aproximar. O botão “Girar” liga uma rotação lenta contínua.</li>
  <li><b>No celular</b> — a HUD se reorganiza: leituras em uma faixa, doca com rótulos curtos e o painel abre como folha inferior. A cena reduz pelagem, sombras e antialiasing para manter a fluidez.</li>
  <li><b>Painel</b> — esquema, velocidade, procedimentos aversivos, estado interno do sujeito e ações de sessão. Fica fechado por padrão para não competir com a cena.</li>
</ul>

<h2>Roteiro de experimentos</h2>
<p>A sequência abaixo reproduz a ordem clássica de um laboratório didático. Cada etapa depende da anterior.</p>
<ol>
  <li><b>Treino ao comedouro.</b> Com o esquema em <code>Extinção</code>, clique em “Dar comida” umas quinze vezes, deixando o rato comer entre uma e outra. Observe no painel a barra “Som do dispensador → comida” subir. Sem essa etapa, a modelagem funciona, mas leva bem mais tempo.</li>
  <li><b>Modelagem por aproximações sucessivas.</b> Reforce o rato quando ele estiver no lado esquerdo da caixa. Depois só quando estiver junto da alavanca. Depois só quando levantar perto dela. A primeira pressão acidental virá; reforce-a imediatamente. Acompanhe “Força da resposta de pressionar”.</li>
  <li><b>Reforço contínuo.</b> Mude para <code>CRF</code> e pare de intervir. A taxa sobe e se estabiliza em torno de 10 a 13 respostas por minuto — o teto é o tempo que o rato gasta comendo.</li>
  <li><b>Esquemas intermitentes.</b> Compare os traçados:
    <ul>
      <li><code>FR 20</code> — pausa após cada reforço, depois corrida em alta taxa (“degraus de escada”). A pausa cresce com o tamanho da razão.</li>
      <li><code>VR 10</code> — taxa alta e constante, praticamente sem pausas.</li>
      <li><code>FI 30</code> — festão: quase nada logo após o reforço, aceleração conforme o intervalo se aproxima do fim.</li>
      <li><code>VI 30</code> — taxa moderada e constante.</li>
    </ul>
  </li>
  <li><b>Extinção e efeito do reforço parcial.</b> Logo após um período em <code>CRF</code>, mude para <code>Extinção</code>. Verá um surto inicial e depois a queda. Agora clique em “Novo sujeito”, refaça as etapas 1 a 3, treine em <code>VR 10</code> por alguns minutos e só então corte o reforço: a resposta persiste muito mais. A barra “Expectativa de reforço por pressão” explica por quê — cada pressão não reforçada só é uma violação na medida em que o sujeito esperava reforço.</li>
  <li><b>Saciedade.</b> Numa sessão longa em <code>CRF</code> a taxa cai sozinha conforme a barra “Saciedade” sobe. “Intervalo entre sessões” avança quinze minutos, zera a saciedade e produz um pouco de recuperação espontânea.</li>
  <li><b>Punição.</b> Com o rato pressionando em <code>VI 30</code>, ligue “Punir cada pressão”. A supressão é rápida; ao desligar, a resposta se recupera gradualmente enquanto “Medo da barra” decai.</li>
  <li><b>Condicionamento clássico e supressão condicionada.</b> Mantenha <code>VI 30</code> e ligue “Parear som → choque”. O programa roda ensaios automáticos: 10 s de linha de base, 10 s de som, choque no fim do som. A razão de supressão acumulada aparece na HUD — 0,50 significa nenhuma supressão; valores próximos de 0 significam que o rato para de pressionar durante o som. Desligue o pareamento e toque o som sozinho algumas vezes para ver a extinção pavloviana.</li>
</ol>

<h2>O modelo por trás do rato</h2>
<p>Não há inteligência artificial nem animação roteirizada. O rato escolhe o próximo ato por sorteio ponderado; o que a aprendizagem altera são os pesos.</p>

<h3>Força operante</h3>
<div className="eq">ΔForça = 0,38 · e^(−atraso / 2,5 s) · (0,35 + 0,65 · SomComida) · (1 − Força)</div>
<p>Aplicada a cada pelota consumida. O termo exponencial é o gradiente de atraso do reforço; o termo em <code>SomComida</code> faz do treino ao comedouro um multiplicador da aprendizagem.</p>

<h3>Extinção e reforço parcial</h3>
<div className="eq">Força ← Força · (1 − 0,04 · Expectativa)   a cada pressão não reforçada<br />Expectativa ← Expectativa + 0,05 · (reforçada − Expectativa)</div>
<p>Um sujeito vindo de CRF tem expectativa próxima de 1 e extingue rápido; vindo de VR 10, expectativa próxima de 0,1 e extingue devagar.</p>

<h3>Esquemas</h3>
<p>Em <code>FR</code>, o peso de pressionar cai a quase zero durante uma pausa proporcional a <code>0,9·√n + 0,18·n</code> segundos e depois sobe acima do normal (corrida). Em <code>FI</code>, o peso cresce com <code>(tempo decorrido / 0,85·intervalo)^2,2</code>, produzindo o festão. Em <code>VR</code>, o peso é multiplicado por 1,4.</p>

<h3>Condicionamento clássico</h3>
<div className="eq">ΔV(CS) = 0,35 · (1 − ΣV)   quando o choque ocorre com o CS presente<br />ΔV(CS) = −0,10 · V(CS)     quando o CS termina sem choque</div>
<p>É a regra de Rescorla e Wagner. O medo ativo reduz em até 85% a probabilidade de aproximar-se da barra e de pressionar, o que gera a supressão condicionada medida pela razão de Estes e Skinner: <code>B / (A + B)</code>, com A = respostas nos 10 s antes do CS e B = respostas durante o CS.</p>

<h3>Motivação</h3>
<p>Cada pelota soma 0,4 ponto percentual à saciedade, que reduz em até 60% a tendência a buscar a barra. Ela decai lentamente com o tempo e é zerada pelo intervalo entre sessões.</p>

<h2>Limitações</h2>
<ul>
  <li>Os parâmetros foram calibrados para reproduzir os padrões qualitativos de Ferster e Skinner, não ajustados a registros publicados. O programa é didático, não um instrumento de pesquisa.</li>
  <li>Não há discriminação de estímulos (S<sup>D</sup>/S<sup>Δ</sup>), esquemas concorrentes, encadeamento nem esquiva — bons candidatos para contribuições.</li>
  <li>O festão do FI vem de uma função de potência sobre o tempo, não de um modelo de relógio interno.</li>
</ul>

<h2>Referências</h2>
<ul className="refs">
  <li>Skinner, B. F. (1938). <i>The Behavior of Organisms</i>. Appleton-Century.</li>
  <li>Estes, W. K. & Skinner, B. F. (1941). Some quantitative properties of anxiety. <i>Journal of Experimental Psychology</i>, 29, 390–400.</li>
  <li>Ferster, C. B. & Skinner, B. F. (1957). <i>Schedules of Reinforcement</i>. Appleton-Century-Crofts.</li>
  <li>Rescorla, R. A. & Wagner, A. R. (1972). A theory of Pavlovian conditioning. Em Black & Prokasy (orgs.), <i>Classical Conditioning II</i>. Appleton-Century-Crofts.</li>
  <li>Catania, A. C. (1998). <i>Learning</i> (4ª ed.). Prentice Hall.</li>
</ul>

<footer>Amodeu Simulator v0.2 · licença MIT · implementação original, sem código, arte ou dados de outros simuladores.</footer>

      </div>
    </div>
  );
}

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Api } from '../api';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('graficoPh', { static: false }) graficoPhCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoTurbidez', { static: false }) graficoTurbidezCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoQualidade', { static: false }) graficoQualidadeCanvas!: ElementRef<HTMLCanvasElement>;

  dados: any[] = [];
  dadoAtual: any = {}; // Objeto que armazena o último dado para os cards de status
  dataSelecionada: string = '';
  collection: string = 'JuChecchio';
  intervalo: any;
  graficoPh: any;
  graficoTurbidez: any;
  graficoQualidade: any;

  // Variável para controlar qual gráfico está visível (ph, turbidez, qualidade ou null)
  graficoVisivel: 'ph' | 'turbidez' | 'qualidade' | null = null;

  constructor(private apiService: Api) {}

  ngOnInit() {
    this.carregarDados();

    // Atualização automática a cada 5 segundos
    this.intervalo = setInterval(() => {
      if (this.dataSelecionada) this.buscarPorData();
      else this.carregarDados();
    }, 5000);
  }

  ngAfterViewInit() {
    // A renderização dos gráficos é feita após a busca dos dados.
  }

  ngOnDestroy() {
    if (this.intervalo) clearInterval(this.intervalo);
    this.destruirGraficos();
  }

  carregarDados(): void {
    this.apiService.getSensores().subscribe({
      next: (data: any[]) => {
        this.dados = data;
        this.dadoAtual = data.length > 0 ? data[data.length - 1] : {}; 
        this.renderizarGraficos();
      },
      error: (err) => console.error('Erro ao carregar dados:', err)
    });
  }

  buscarPorData(): void {
    if (!this.dataSelecionada) return;
    this.apiService.getHistoricoPorDia(this.collection, this.dataSelecionada).subscribe({
      next: (data: any[]) => {
        this.dados = data;
        this.dadoAtual = data.length > 0 ? data[data.length - 1] : {}; 
        this.renderizarGraficos();
      },
      error: (err) => console.error('Erro ao buscar por data:', err)
    });
  }

  // MÉTODO PRINCIPAL: Calcula cor e status com base no parâmetro
  getStatus(parametro: 'ph' | 'turbidez' | 'tds'): { valor: number, status: string, cor: 'success' | 'warning' | 'danger' } {
    const valor = Number(this.dadoAtual[parametro]) || 0;
    
    // Alerta no console se houver dados mas o valor for 0, indicando provável erro na chave da API
    if (this.dados.length > 0 && valor === 0 && this.dadoAtual[parametro] !== 0) {
      console.warn(`[AVISO] Chave '${parametro}' pode estar incorreta ou valor é nulo/inválido. Verifique o nome da chave na API.`);
    }

    switch (parametro) {
      case 'ph':
        // Critério PH: Bom: 6,5–8,5 | Médio: 6,0–6,5 ou 8,5–9,0 | Ruim: < 6,0 ou > 9,0
        if (valor >= 6.5 && valor <= 8.5) { 
          return { valor, status: 'Execelente para consumo', cor: 'success' };
        } else if ((valor >= 6.0 && valor <= 6.4) || (valor >= 8.6 && valor <= 9.5)) {
          return { valor, status: 'Razoável para consumo', cor: 'warning' };
        } else { // < 6.0 ou > 9.0
          return { valor, status: 'Inadequado para consumo', cor: 'danger' };
        }
      
      case 'turbidez':
        // Critério Turbidez: 0 = Excelente | 1 a 5 = Razoável | Acima de 5 = Ruim
        if (valor === 0) { 
          return { valor, status: 'Excelente para consumo ', cor: 'success' };
        } else if (valor >= 0.1 && valor <= 5) { 
          return { valor, status: 'Razoável para consumo', cor: 'warning' };
        } else { // Valor > 5
          return { valor, status: 'Inadequado para consumo', cor: 'danger' };
        }

      case 'tds':
        // Critério TDS: 50-300: Bom | 300-600: Aceitável | > 600: Ruim
        if (valor >= 50 && valor <= 300) {
          return { valor, status: 'Excelente para consumo', cor: 'success' };
        } else if (valor > 300 && valor <= 600) {
          return { valor, status: 'Razoável para consumo', cor: 'warning' };
        } else if (valor > 600 && valor <= 900) {
          return { valor, status: 'Inadequado para consumo', cor: 'danger' };
        } else if (valor > 900) {
          return { valor, status: 'Inadequado para consumo', cor: 'danger' };
        } else { // Valor abaixo de 50 ppm
          return { valor, status: 'Inadequado para consumo', cor: 'danger' };
        }
      default:
        return { valor, status: 'Sem Dados', cor: 'warning' };
    }
  }

  // MÉTODO: Alterna a visibilidade do gráfico (mantido)
  alternarGrafico(grafico: 'ph' | 'turbidez' | 'qualidade'): void {
    if (this.graficoVisivel === grafico) {
      this.graficoVisivel = null;
    } else {
      this.graficoVisivel = grafico;
      setTimeout(() => {
         if (this.dados.length > 0) this.renderizarGraficos();
      }, 50);
    }
  }

  // --- Métodos de Renderização e Gráficos (mantidos para Chart.js) ---

  renderizarGraficos(): void {
    setTimeout(() => {
      this.atualizarGraficoPh();
      this.atualizarGraficoTurbidez();
      this.atualizarGraficoQualidade();
    }, 300);
  }

  destruirGraficos(): void {
    [this.graficoPh, this.graficoTurbidez, this.graficoQualidade].forEach(g => g && g.destroy());
  }

  atualizarGraficoPh(): void {
      if (!this.graficoPhCanvas) return;
      if (this.graficoPh) this.graficoPh.destroy();

      const labels = this.dados.map((d, i) => d.timestamp || `Leitura ${i + 1}`);
      const ph = this.dados.map(d => Number(d.ph) || 0);

      this.graficoPh = new Chart(this.graficoPhCanvas.nativeElement, {
        type: 'line',
        data: { labels, datasets: [{ label: 'PH', data: ph, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.2)', borderWidth: 2, tension: 0.3, pointRadius: 0 }] },
        options: this.getChartOptions()
      });
    }

    atualizarGraficoTurbidez(): void {
      if (!this.graficoTurbidezCanvas) return;
      if (this.graficoTurbidez) this.graficoTurbidez.destroy();

      const labels = this.dados.map((d, i) => d.timestamp || `Leitura ${i + 1}`);
      const turbidez = this.dados.map(d => Number(d.turbidez) || 0);

      this.graficoTurbidez = new Chart(this.graficoTurbidezCanvas.nativeElement, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Turbidez', data: turbidez, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.2)', borderWidth: 2, tension: 0.3, pointRadius: 0 }] },
        options: this.getChartOptions()
      });
    }

    atualizarGraficoQualidade(): void {
      if (!this.graficoQualidadeCanvas) return;
      if (this.graficoQualidade) this.graficoQualidade.destroy();

      const labels = this.dados.map((d, i) => d.timestamp || `Leitura ${i + 1}`);
      const tds = this.dados.map(d => Number(d.tds) || 0);

      this.graficoQualidade = new Chart(this.graficoQualidadeCanvas.nativeElement, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Qualidade da Água (TDS)', data: tds, borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.2)', borderWidth: 2, tension: 0.3, pointRadius: 0 }] },
        options: this.getChartOptions()
      });
    }
  
    getChartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: { 
          legend: { 
            labels: { 
              color: '#e0e7ff',
              font: { size: 14 }
            } 
          } 
        },
        scales: {
          x: { 
            ticks: { color: '#c7d2fe' }, 
            grid: { color: '#312e81' } 
          },
          y: { 
            ticks: { color: '#c7d2fe' }, 
            grid: { color: '#312e81' } 
          }
        }
      } as const;
    }
}
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

  @ViewChild('graficoPh') graficoPhCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoTurbidez') graficoTurbidezCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoResiduos') graficoResiduosCanvas!: ElementRef<HTMLCanvasElement>;

  dados: any[] = [];
  dataSelecionada: string = '';
  collection: string = 'JuChecchio';
  intervalo: any;
  graficoPh: any;
  graficoTurbidez: any;
  graficoResiduos: any;

  constructor(private apiService: Api) {}

  ngOnInit() {
    this.carregarDados();

    // Atualização automática a cada 10 segundos
    this.intervalo = setInterval(() => {
      if (this.dataSelecionada) this.buscarPorData();
      else this.carregarDados();
    }, 10000);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.dados.length > 0) this.renderizarGraficos();
    }, 500);
  }

  ngOnDestroy() {
    if (this.intervalo) clearInterval(this.intervalo);
    this.destruirGraficos();
  }

  carregarDados(): void {
    this.apiService.getSensores().subscribe({
      next: (data: any[]) => {
        console.log('📡 Dados recebidos da API:', data);
        this.dados = data;
        this.renderizarGraficos();
      },
      error: (err) => console.error('Erro ao carregar dados:', err)
    });
  }

  buscarPorData(): void {
    if (!this.dataSelecionada) return;
    this.apiService.getHistoricoPorDia(this.collection, this.dataSelecionada).subscribe({
      next: (data: any[]) => {
        console.log('📅 Dados filtrados da API:', data);
        this.dados = data;
        this.renderizarGraficos();
      },
      error: (err) => console.error('Erro ao buscar por data:', err)
    });
  }

  renderizarGraficos(): void {
    setTimeout(() => {
      this.atualizarGraficoPh();
      this.atualizarGraficoTurbidez();
      this.atualizarGraficoResiduos();
    }, 300);
  }

  destruirGraficos(): void {
    [this.graficoPh, this.graficoTurbidez, this.graficoResiduos].forEach(g => g && g.destroy());
  }

  atualizarGraficoPh(): void {
    if (!this.graficoPhCanvas) return;
    if (this.graficoPh) this.graficoPh.destroy();

    const labels = this.dados.map((d, i) => d.timestamp || `Leitura ${i + 1}`);
    const ph = this.dados.map(d => Number(d['PH']) || 0);

    this.graficoPh = new Chart(this.graficoPhCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'PH',
          data: ph,
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96,165,250,0.2)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        }]
      },
      options: this.getChartOptions()
    });
  }

  atualizarGraficoTurbidez(): void {
    if (!this.graficoTurbidezCanvas) return;
    if (this.graficoTurbidez) this.graficoTurbidez.destroy();

    const labels = this.dados.map((d, i) => d.timestamp || `Leitura ${i + 1}`);
    const turbidez = this.dados.map(d => Number(d['Turbidez']) || 0);

    this.graficoTurbidez = new Chart(this.graficoTurbidezCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Turbidez',
          data: turbidez,
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167,139,250,0.2)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        }]
      },
      options: this.getChartOptions()
    });
  }

  atualizarGraficoResiduos(): void {
    if (!this.graficoResiduosCanvas) return;
    if (this.graficoResiduos) this.graficoResiduos.destroy();

    const labels = this.dados.map((d, i) => d.timestamp || `Leitura ${i + 1}`);
    const residuos = this.dados.map(d => {
      const val = d['Resíduos Sólidos'];
      if (typeof val === 'string' && val.includes('%')) return parseFloat(val.replace('%', ''));
      return Number(val) || 0;
    });

    this.graficoResiduos = new Chart(this.graficoResiduosCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Resíduos Sólidos (%)',
          data: residuos,
          borderColor: '#f472b6',
          backgroundColor: 'rgba(244,114,182,0.2)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        }]
      },
      options: this.getChartOptions()
    });
  }

  // ✅ Corrigido para Chart.js v4+ (sem erro de tipagem)
  getChartOptions() {
    return {
      responsive: true,
      animation: { duration: 0 }, // ← Corrigido (antes estava animation: false)
      plugins: {
        legend: { labels: { color: '#e0e7ff' } }
      },
      scales: {
        x: { ticks: { color: '#c7d2fe' }, grid: { color: '#312e81' } },
        y: { ticks: { color: '#c7d2fe' }, grid: { color: '#312e81' } }
      }
    } as const;
  }
}

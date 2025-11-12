import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private apiUrl: string = 'https://esp32-mongodb-idev3.onrender.com/';

  constructor(private http: HttpClient) {}

  // 🔹 Função antiga — mantém para testes
  getSensores(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl + 'api/leituras/JuChecchio');
  }

  // 🔹 Nova função — busca por data específica
  getHistoricoPorDia(collection: string, data: string): Observable<any[]> {
    const url = `${this.apiUrl}api/historico-dia/${collection}?data=${data}`;
    return this.http.get<any[]>(url);
  }
}

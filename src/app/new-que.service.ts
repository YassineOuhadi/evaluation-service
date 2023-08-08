import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://localhost:9091';

  constructor(private http: HttpClient) {}

  postQuestionData(data: any): Observable<any> {
    const url = this.apiUrl+'/question/new';
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(url, data, { headers });
  }

  getLang(): Observable<any> {
    const url = this.apiUrl+'/language/get';
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.get(url, { headers });
  }

  getCourses(): Observable<any> {
    const url = this.apiUrl+'/course/get';
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.get(url, { headers });
  }

  getQuestions(count: any): Observable<any> {
    const url = `${this.apiUrl}/question/get`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const params = new HttpParams().set('count', count);
    return this.http.get(url, { headers, params });
  }

  validateResponse(data: any): Observable<any> {
    const url = `${this.apiUrl}/question/validate`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(url, data, { headers });
  }

  getAnswer(questionId: any): Observable<any> {
    const url = `${this.apiUrl}/question/answer`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const params = new HttpParams().set('idQuestion', questionId);
    return this.http.get(url, { headers, params });
  }



}

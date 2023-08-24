import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private apiUrl = 'http://localhost:9091';

  constructor(private http: HttpClient) { }

  /* Create page */

  createQuestion(data: any): Observable<any> {
    const url = this.apiUrl + '/question/new';
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(url, data, { headers });
  }

  editQuestion(data: any): Observable<any> {
    const url = this.apiUrl + '/question/edit';
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(url, data, { headers });
  }


  /* List questions page */

  deleteQuestion(questionId: any): Observable<any> {
    const url = `${this.apiUrl}/question/delete`; // Replace with your actual API endpoint
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const params = new HttpParams().set('id', questionId);
    return this.http.post(url, null, { headers, params });
  }

  deleteQuestionFromCourse(data: any): Observable<any> {
    const url = this.apiUrl + '/course/deleteQuestion';
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(url, data, { headers });
  }

  getLang(): Observable<any> {
    const url = this.apiUrl + '/language/get';
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.get(url, { headers });
  }

  getCourses(): Observable<any> {
    const url = this.apiUrl + '/course/get';
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.get(url, { headers });
  }

  /*getQuestions(count: any): Observable<any> {
    const url = `${this.apiUrl}/question/get`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const params = new HttpParams().set('count', count);
    return this.http.get(url, { headers, params });
  }*/

  getAllQuestions(
    page: number,
    size: number,
    questionCodeFilter?: string,
    languageId?: number,
    courseId?: number,
    type?: string,
    sortAttribute?: string,
    sortDirection?: string
  ): Observable<any> {
    const url = `${this.apiUrl}/question/getAll`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');

    let params = new HttpParams(); // Initialize HttpParams

    params = params.set('page', page.toString());
    params = params.set('size', size.toString());

    if (questionCodeFilter !== undefined) {
      params = params.set('questionCodeFilter', questionCodeFilter.toString());
    }

    if (languageId !== undefined) {
      params = params.set('languageId', languageId.toString());
    }
    if (courseId !== undefined) {
      params = params.set('courseId', courseId.toString());
    }
    if (type) {
      params = params.set('type', type);
    }
    if (sortAttribute) {
      params = params.set('sortAttribute', sortAttribute);
    }
    if (sortDirection) {
      params = params.set('sortDirection', sortDirection);
    }

    return this.http.get(url, { headers, params });
  }


  /* final exam */

  canTakeExam(campaignId: number, userId: number): Observable<boolean> {
    const url = `${this.apiUrl}/exam/canTake`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const params = new HttpParams()
      .set('campaignId', campaignId)
      .set('userId', userId);
    return this.http.get<boolean>(url, { headers, params });
  }

  beginExam(data: any): Observable<any> {
    const url = `${this.apiUrl}/exam/begin`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(url, data, { headers });
  }

  validateQuestion(data: any): Observable<any> {
    const url = `${this.apiUrl}/exam/validate`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(url, data, { headers });
  }

  quitExam(examId: number): Observable<any> {
    const url = `${this.apiUrl}/exam/endExam`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const params = new HttpParams().set('examId', examId.toString());
    return this.http.post(url, null, { headers, params });
  }


  /* Quiz */

  getQuestionsByCourse(courseId: any): Observable<any> {
    const url = `${this.apiUrl}/question/getByCourse`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    let params = new HttpParams();
    if (courseId !== undefined) {
      params = params.set('courseId', courseId);
    }
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

  findQuestion(questionId: any): Observable<any> {
    const url = `${this.apiUrl}/question/find`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const params = new HttpParams().set('id', questionId);
    return this.http.get(url, { headers, params });
  }
}
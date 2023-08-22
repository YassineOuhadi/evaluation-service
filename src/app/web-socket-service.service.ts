import { WebSocketSubject } from 'rxjs/webSocket';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WebSocketServiceService {

  private socket$: WebSocketSubject<any>;

  constructor() {
    this.socket$ = new WebSocketSubject('ws://localhost:9091/ws'); // Replace with your server URL
  }

  getWebSocketSubject() {
    return this.socket$;
  }

  sendMessage(message: any): void {
    this.socket$.next(message);
  }
}

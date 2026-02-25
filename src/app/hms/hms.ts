import { Component, signal, computed, effect, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * CareConnect Mobile - Angular Implementation
 * Updated to use Google Material Symbols for improved visibility.
 */

@Component({
  selector: 'glb-hms',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hms.html',
  styleUrls: ['./hms.scss']
})
export class HmsComponent {
  isAuthenticated = signal(false);
  userName = signal('Dr. Sarah Miller');
  activeTab = signal('home');
  selectedPatient = signal('');
  isChatOpen = signal(false);
  isVideoActive = signal(false);
  showTimeout = signal(false);

  userInitials = computed(() => {
    const names = this.userName().split(' ');
    return names.length > 1 ? names[names.length - 1].substring(0, 2).toUpperCase() : 'DR';
  });

  patients = [
    { name: 'Jane Smith', status: 'Stable' },
    { name: 'Robert Fox', status: 'Urgent' },
    { name: 'Alex Wong', status: 'Reviewing Labs' },
    { name: 'Emily Chen', status: 'Stable' }
  ];

  chatMessages = signal([
    { text: 'Hello Doctor, I have a question about my medication.', sender: 'them', encrypting: false },
    { text: 'Of course, Jane. How can I help?', sender: 'me', encrypting: false }
  ]);

  private timeoutId: any;

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) {
        this.resetInactivityTimer();
      }
    });
  }

  login(name: string) {
    if (name) this.userName.set(name);
    this.isAuthenticated.set(true);
  }

  logout() {
    this.isAuthenticated.set(false);
    this.showTimeout.set(false);
    location.reload();
  }

  openChat(name: string) {
    this.selectedPatient.set(name);
    this.isChatOpen.set(true);
  }

  sendMessage(input: HTMLInputElement) {
    const val = input.value.trim();
    if (!val) return;

    const newMsg = { text: val, sender: 'me', encrypting: true };
    this.chatMessages.update(msgs => [...msgs, newMsg]);
    input.value = '';

    setTimeout(() => {
      this.chatMessages.update(msgs => {
        const updated = [...msgs];
        const last = updated[updated.length - 1];
        if (last) last.encrypting = false;
        return updated;
      });
    }, 800);
  }

  toggleVideo(state: boolean) {
    this.isVideoActive.set(state);
  }

  @HostListener('document:mousedown')
  @HostListener('document:touchstart')
  @HostListener('document:keydown')
  resetInactivityTimer() {
    if (!this.isAuthenticated()) return;
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.showTimeout.set(true);
    }, 45000);
  }

  extendSession() {
    this.showTimeout.set(false);
    this.resetInactivityTimer();
  }
}
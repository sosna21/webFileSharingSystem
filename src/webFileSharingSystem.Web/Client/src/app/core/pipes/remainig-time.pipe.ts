import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'remainigTime',
})
export class RemainigTimePipe implements PipeTransform {
  transform(validUntil: string | Date | null | undefined): string {
    if (!validUntil) return 'Indefinitely ♾️';

    const now = Date.now();
    const end = new Date(validUntil).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(diff / 1000 / 60 / 60);

    // > 48 hours → show full date
    if (hours > 48) {
      return new Date(validUntil).toLocaleDateString();
    }

    // 1h–48h → show hours
    if (hours >= 1) {
      return `${hours} hour${hours > 1 ? 's' : ''} left`;
    }

    // 1m–59m → show minutes
    if (minutes >= 1) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} left`;
    }

    // < 1 minute → show seconds
    return `${seconds} second${seconds !== 1 ? 's' : ''} left`;
  }
}

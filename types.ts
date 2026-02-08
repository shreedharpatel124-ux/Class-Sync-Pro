
export type AppState = 'setup' | 'active' | 'capture-review' | 'summary';

export interface LectureSlide {
  id: string;
  image: string;
  description: string;
  timestamp: string;
}

export interface LectureSession {
  id: string;
  title: string;
  date: string;
  slides: LectureSlide[];
  audioSummary?: string;
  isComplete: boolean;
}

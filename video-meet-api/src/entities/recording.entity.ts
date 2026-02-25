import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Meeting } from './meeting.entity';

@Entity('recordings')
export class Recording {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  s3Url: string;

  @Column({ nullable: true })
  duration?: number;

  @Column({
    type: 'enum',
    enum: ['processing', 'ready', 'failed'],
    default: 'processing',
  })
  status: 'processing' | 'ready' | 'failed';

  @ManyToOne(() => Meeting, (meeting) => meeting.recordings)
  meeting: Meeting;

  @Column()
  meetingId: string;

  @CreateDateColumn()
  createdAt: Date;
}

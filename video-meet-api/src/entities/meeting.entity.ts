import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Recording } from './recording.entity';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  sessionId: string;

  @Column({
    type: 'enum',
    enum: ['active', 'ended', 'recording'],
    default: 'active',
  })
  status: 'active' | 'ended' | 'recording';

  @ManyToOne(() => User, (user) => user.createdMeetings)
  createdBy: User;

  @Column()
  createdById: string;

  @OneToMany(() => Recording, (recording) => recording.meeting)
  recordings: Recording[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Coverage } from './Coverage';

@Entity()
export class Coverage_Values {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column()
  value: number;

  @Column()
  std: number;

  @Column()
  ignore: boolean;

  @Column()
  data_source: string;

  @ManyToOne((type) => Coverage)
  @JoinColumn({ name: 'fk_coverage_id', referencedColumnName: 'id' })
  coverage: Coverage;
}

import {
  Column,
  Entity,
  MultiLineString,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Ways {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  OSM_Id: number;

  @Column()
  way_name: string;

  @Column()
  node_start: number;

  @Column()
  node_end: number;

  @Column()
  length: number;

  @Column('geometry')
  section_geom: MultiLineString;

  @Column()
  IsHighway: boolean;
}

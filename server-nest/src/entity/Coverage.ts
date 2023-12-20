import {Column, Entity, JoinColumn, ManyToOne, MultiLineString, PrimaryGeneratedColumn} from "typeorm";
import {Ways} from "./Ways";

@Entity()
export class Coverage {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    direction: string

    @Column()
    distance01: number

    @Column()
    distance02: number

    @Column('date')
    compute_time: string

    @Column()
    lat_mapped: number

    @Column()
    lon_mapped: number

    @Column('geometry')
    section_geom: MultiLineString

    @Column()
    window_distance: number

    @ManyToOne(type => Ways)
    @JoinColumn({name: 'fk_way_id', referencedColumnName: 'id'})
    way: Ways
}
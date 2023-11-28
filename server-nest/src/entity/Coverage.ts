import {Column, Entity, JoinColumn, ManyToOne, MultiLineString, PrimaryGeneratedColumn} from "typeorm";
import {Trips} from "./Trips";
import {Ways} from "./Ways";
import {Map_References} from "./Map_References";

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

    @ManyToOne(type => Trips)
    @JoinColumn({name: 'fk_trip_id', referencedColumnName: 'id'})
    trip: Trips

    @ManyToOne(type => Ways)
    @JoinColumn({name: 'fk_way_id', referencedColumnName: 'id'})
    way: Ways

    @ManyToOne(type => Map_References)
    @JoinColumn({name: 'fk_map_references_id', referencedColumnName: 'id'})
    map_reference: Map_References
}
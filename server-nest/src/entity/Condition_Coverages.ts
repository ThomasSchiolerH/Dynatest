import {Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn, MultiLineString} from "typeorm";
import {Trips} from "./Trips";
import {Ways} from "./Ways";
import {Map_References} from "./Map_References";

@Entity()
export class Condition_Coverages {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    type: string

    @Column()
    value: number

    @Column('geometry')
    section_geom: MultiLineString

    @Column('date')
    compute_time: string

    @Column()
    distance01: number

    @Column()
    Distance02: number

    @Column()
    lat_mapped: string

    @Column()
    lon_mapped: string

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

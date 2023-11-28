import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import { Ways } from "./Ways";

@Entity()
export class Condition_Pictures {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    lat_mapped: number

    @Column()
    lon_mapped: number

    @Column()
    name: string

    @Column()
    order: number

    @ManyToOne(type => Ways)
    @JoinColumn({name: 'fk_way_id', referencedColumnName: 'id'})
    way: Ways
}
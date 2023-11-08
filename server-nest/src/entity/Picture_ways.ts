import {Column, Entity, MultiLineString, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class Picture_ways {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column('geometry')
    section_geom: MultiLineString
}
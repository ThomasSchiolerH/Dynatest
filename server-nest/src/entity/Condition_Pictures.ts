import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

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
}
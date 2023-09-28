import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class Map_References {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('geometry')
    position_map_matched: string
}
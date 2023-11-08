import {Column, Entity, Point, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class Trips {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    task_id: number

    @Column('date')
    start_time_utc: string

    @Column('date')
    end_time_utc: string

    @Column('geometry')
    start_position: Point

    @Column('geometry')
    end_position: Point

    @Column('date')
    created_date: string

    @Column('date')
    updated_date: string

    @Column()
    fully_imported: boolean
}
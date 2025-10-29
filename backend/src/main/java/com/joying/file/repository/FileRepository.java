package com.joying.file.repository;

import com.joying.file.domain.File;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface FileRepository extends JpaRepository<File, Long> {

//    @Query("""
//        SELECT f
//        FROM File f
//        WHERE f.createdAt < :cutoff
//        AND NOT EXISTS (SELECT 1 FROM ProductFile pf WHERE pf.file = f)
//        AND NOT EXISTS (SELECT 1 FROM ReviewFile rf WHERE rf.file = f)
//        AND NOT EXISTS (SELECT 1 FROM RentalVideo rv WHERE rv.file = f)
//        AND NOT EXISTS (SELECT 1 FROM Member m WHERE m.profileImage = f)
//        """)

    @Query("""
        SELECT f
        FROM File f
        WHERE f.createdAt < :cutoff
        AND NOT EXISTS (SELECT 1 FROM ProductFile pf WHERE pf.file = f)
        AND NOT EXISTS (SELECT 1 FROM ReviewFile rf WHERE rf.file = f)
        AND NOT EXISTS (SELECT 1 FROM Member m WHERE m.profileImage = f)
        """)
    List<File> findOrphanFilesBefore(@Param("cutoff") Instant cutoff);

}

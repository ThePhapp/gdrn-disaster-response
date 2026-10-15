package com.gdrn.rescue.application.port;

import com.gdrn.rescue.application.MissionPageResult;
import com.gdrn.rescue.domain.Mission;
import com.gdrn.rescue.domain.MissionStatus;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface MissionRepository {
    Mission insert(Mission mission);
    boolean updateMission(Mission mission, MissionStatus expectedCurrentStatus);
    Optional<Mission> findById(UUID id);
    Optional<Mission> findByReportId(UUID reportId);
    boolean existsByReportId(UUID reportId);
    boolean hasActiveMissionForTeam(UUID teamId);
    Set<UUID> findActiveTeamIds();
    MissionPageResult findMissions(Optional<UUID> reportId, Optional<UUID> teamId,
                                   Optional<MissionStatus> status, int page, int size, String sort);
}

package com.gdrn.rescue.application.port;

import com.gdrn.rescue.application.RescueTeamPageResult;
import com.gdrn.rescue.domain.RescueTeam;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RescueTeamRepository {
    RescueTeam save(RescueTeam team);
    Optional<RescueTeam> findById(UUID id);
    Optional<RescueTeam> findByName(String name);
    List<RescueTeam> findAll();
    RescueTeamPageResult findTeams(int page, int size, String sort, String availability);
}

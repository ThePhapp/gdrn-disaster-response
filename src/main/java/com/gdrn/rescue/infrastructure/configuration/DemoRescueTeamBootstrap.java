package com.gdrn.rescue.infrastructure.configuration;

import com.gdrn.rescue.application.port.RescueTeamRepository;
import com.gdrn.rescue.domain.RescueTeam;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;

@Component
@Profile("demo")
public class DemoRescueTeamBootstrap implements ApplicationRunner {
    private static final UUID TEAM_1_ID = UUID.fromString("00000000-0000-4000-8000-000000000006");
    private static final UUID TEAM_2_ID = UUID.fromString("00000000-0000-4000-8000-000000000008");

    private final RescueTeamRepository teams;
    private final TransactionTemplate transaction;

    public DemoRescueTeamBootstrap(RescueTeamRepository teams, TransactionTemplate transaction) {
        this.teams = teams;
        this.transaction = transaction;
    }

    @Override
    public void run(ApplicationArguments args) {
        transaction.executeWithoutResult(status -> {
            seedTeam(TEAM_1_ID, "Demo team 1");
            seedTeam(TEAM_2_ID, "Demo team 2");
        });
    }

    private void seedTeam(UUID id, String name) {
        if (teams.findById(id).isEmpty() && teams.findByName(name).isEmpty()) {
            teams.save(new RescueTeam(id, name));
        }
    }
}

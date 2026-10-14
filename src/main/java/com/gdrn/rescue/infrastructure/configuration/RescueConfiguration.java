package com.gdrn.rescue.infrastructure.configuration;

import com.gdrn.rescue.application.RescueService;
import com.gdrn.rescue.application.port.MissionRepository;
import com.gdrn.rescue.application.port.ReportLookupPort;
import com.gdrn.rescue.application.port.RescueTeamRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class RescueConfiguration {
    @Bean
    public RescueService rescueService(RescueTeamRepository teams,
                                       MissionRepository missions,
                                       ReportLookupPort reportLookup) {
        return new RescueService(teams, missions, reportLookup);
    }
}

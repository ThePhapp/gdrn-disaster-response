package com.gdrn.dashboard.infrastructure;

import com.gdrn.dashboard.application.DashboardService;
import com.gdrn.dashboard.application.port.DashboardStatistics;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class DashboardConfiguration {
    @Bean DashboardService dashboardService(DashboardStatistics statistics) {
        return new DashboardService(statistics);
    }
}

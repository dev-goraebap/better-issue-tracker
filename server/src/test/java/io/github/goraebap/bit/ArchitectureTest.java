package io.github.goraebap.bit;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;

@AnalyzeClasses(packages = "io.github.goraebap.bit", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
    private static final String MODULE = "io.github.goraebap.bit.module.";

    @ArchTest
    static final ArchRule MODULES_ARE_ACYCLIC =
            slices().matching(MODULE + "(*)..").should().beFreeOfCycles().allowEmptyShould(true);

    @ArchTest
    static final ArchRule MODULE_INTERNALS_ARE_PRIVATE = classes()
            .that()
            .resideInAPackage(MODULE + ".")
            .should(new ArchCondition<JavaClass>("only depend on other modules' public root contracts") {
                @Override
                public void check(JavaClass source, ConditionEvents events) {
                    String own = moduleOf(source.getPackageName());
                    for (var dependency : source.getDirectDependenciesFromSelf()) {
                        JavaClass target = dependency.getTargetClass();
                        String targetPackage = target.getPackageName();
                        if (!targetPackage.startsWith(MODULE) || own.equals(moduleOf(targetPackage))) continue;
                        if (!targetPackage.equals(MODULE + moduleOf(targetPackage))
                                || !target.getModifiers()
                                        .contains(com.tngtech.archunit.core.domain.JavaModifier.PUBLIC)) {
                            events.add(SimpleConditionEvent.violated(source, dependency.getDescription()));
                        }
                    }
                }
            })
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule SHARED_HAS_NO_BUSINESS_DEPENDENCIES = noClasses()
            .that()
            .resideInAPackage("io.github.goraebap.bit.shared..")
            .should()
            .dependOnClassesThat()
            .resideInAPackage(MODULE + ".");

    // Business implementations arrive in later tasks; keep the boundary rules active from the start.
    @ArchTest
    static final ArchRule INFRASTRUCTURE_IS_PACKAGE_PRIVATE = classes()
            .that()
            .resideInAPackage(MODULE + "*.infrastructure..")
            .should()
            .notBePublic()
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule DOMAIN_IS_PURE_JAVA = noClasses()
            .that()
            .resideInAPackage(MODULE + "*.domain..")
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage(
                    "org.springframework..",
                    "org.jooq..",
                    "jakarta..",
                    MODULE + "*.application..",
                    MODULE + "*.infrastructure..")
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule APPLICATION_USES_PORTS = noClasses()
            .that()
            .resideInAPackage(MODULE + "*.application..")
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage(MODULE + "*.infrastructure..", "org.jooq..")
            .allowEmptyShould(true);

    private static String moduleOf(String packageName) {
        return packageName.substring(MODULE.length()).split("\\.")[0];
    }
}

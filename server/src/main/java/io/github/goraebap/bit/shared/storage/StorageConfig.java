package io.github.goraebap.bit.shared.storage;

import java.net.URI;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * S3-compatible storage when STORAGE_ENDPOINT is set, otherwise files on the data volume, so a plain run needs no
 * storage service and no keys (D-029). Settings come from the environment only (D-090). For S3, path-style addressing
 * keeps one host for every bucket, and checksums are only sent when an operation requires them, since S3-compatible
 * services differ in which ones they accept. Incomplete or unreachable settings turn files off and leave the rest of
 * the server running (D-030).
 */
@Slf4j
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(StorageProperties.class)
class StorageConfig {

    @Bean
    ObjectStorage objectStorage(StorageProperties properties, @Value("${app.auth.secret}") String secret, Clock clock) {
        if (!properties.s3()) return new LocalObjectStorage(properties.localRoot(), secret, clock);
        String problem = incomplete(properties);
        if (problem != null) return new UnavailableStorage(problem);
        var credentials = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(properties.accessKey(), properties.secretKey()));
        var pathStyle = S3Configuration.builder().pathStyleAccessEnabled(true).build();
        var region = Region.of(StorageProperties.present(properties.region()) ? properties.region() : "auto");
        var client = S3Client.builder()
                .endpointOverride(URI.create(properties.endpoint().trim()))
                .region(region)
                .credentialsProvider(credentials)
                .serviceConfiguration(pathStyle)
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .build();
        String browserEndpoint = StorageProperties.present(properties.publicEndpoint())
                ? properties.publicEndpoint().trim()
                : properties.endpoint().trim();
        var presigner = S3Presigner.builder()
                .endpointOverride(URI.create(browserEndpoint))
                .region(region)
                .credentialsProvider(credentials)
                .serviceConfiguration(pathStyle)
                .build();
        return new S3ObjectStorage(client, presigner, properties.bucket().trim(), properties.keyPrefix());
    }

    @Bean
    StorageStatus storageStatus(ObjectStorage objectStorage, StorageProperties properties, Clock clock) {
        var adapter = properties.s3() ? StorageStatus.Adapter.S3 : StorageStatus.Adapter.LOCAL;
        String problem = problem(objectStorage);
        if (problem != null) log.warn("파일 저장소를 쓸 수 없어 파일 기능을 끕니다: {}", problem);
        return new StorageStatus(
                adapter,
                adapter == StorageStatus.Adapter.S3 ? properties.bucket() : null,
                adapter == StorageStatus.Adapter.S3 ? host(properties.endpoint()) : null,
                adapter == StorageStatus.Adapter.S3 ? properties.keyPrefix() : null,
                problem == null,
                problem,
                clock.instant(),
                properties.maxFileBytes());
    }

    /** What keeps the S3 settings from being used, or null when they are whole. */
    private static String incomplete(StorageProperties properties) {
        List<String> missing = new ArrayList<>();
        if (!StorageProperties.present(properties.bucket())) missing.add("STORAGE_BUCKET");
        if (!StorageProperties.present(properties.accessKey())) missing.add("STORAGE_ACCESS_KEY");
        if (!StorageProperties.present(properties.secretKey())) missing.add("STORAGE_SECRET_KEY");
        if (!missing.isEmpty()) return String.join(", ", missing) + " 값이 비어 있습니다";
        if (host(properties.endpoint()) == null) return "STORAGE_ENDPOINT가 주소 형식이 아닙니다";
        if (StorageProperties.present(properties.publicEndpoint()) && host(properties.publicEndpoint()) == null)
            return "STORAGE_PUBLIC_ENDPOINT가 주소 형식이 아닙니다";
        return null;
    }

    /** Why the storage cannot be used, or null when it answered; the reason is shown to the instance admin. */
    private static String problem(ObjectStorage objectStorage) {
        try {
            objectStorage.check();
            return null;
        } catch (S3Exception e) {
            return switch (e.statusCode()) {
                case 401, 403 -> "저장소가 키를 거절했습니다(" + e.statusCode() + "). 키와 버킷 권한을 확인해 주세요";
                case 404 -> "버킷을 찾지 못했습니다(404). STORAGE_BUCKET을 확인해 주세요";
                default -> "저장소가 오류로 답했습니다(" + e.statusCode() + ")";
            };
        } catch (SdkClientException e) {
            return "저장소에 연결하지 못했습니다. STORAGE_ENDPOINT를 확인해 주세요";
        } catch (IllegalStateException e) {
            return e.getMessage();
        }
    }

    /** The scheme and host of an address, without anything a URL might carry after them. */
    private static String host(String address) {
        if (!StorageProperties.present(address)) return null;
        try {
            URI uri = URI.create(address.trim());
            if (uri.getScheme() == null || uri.getHost() == null) return null;
            return uri.getScheme() + "://" + uri.getHost() + (uri.getPort() < 0 ? "" : ":" + uri.getPort());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}

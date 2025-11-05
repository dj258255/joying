package com.joying.region.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.joying.region.service.RegionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/regions")
public class RegionController {

	private final RegionService regionService;

	@GetMapping("/sidos")
	public ResponseEntity<?> getSidos(@RequestParam(required = false) String keyword) {
		return ResponseEntity.ok(regionService.getSidos(keyword));
	}

	@GetMapping("/sidos/{sidoId}/gungus")
	public ResponseEntity<?> getGungus(
		@PathVariable Long sidoId,
		@RequestParam(required = false) String keyword) {
		return ResponseEntity.ok(regionService.getGungus(sidoId, keyword));
	}

	@GetMapping("/gungus/{gunguId}/dongs")
	public ResponseEntity<?> getDongs(
		@PathVariable Long gunguId,
		@RequestParam(required = false) String keyword) {
		return ResponseEntity.ok(regionService.getDongs(gunguId, keyword));
	}
}

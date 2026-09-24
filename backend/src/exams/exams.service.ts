import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { ResultsService } from '../results/results.service';
import { Assessment } from './assessment.entity';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Assessment)
    private readonly assessments: Repository<Assessment>,
    private readonly results: ResultsService,
  ) {}

  findAll(user: AuthenticatedUser) {
    return this.assessments.find({
      where: { organizationId: user.organizationId },
      relations: { class: true, subject: true, academicYear: true, term: true },
    });
  }

  create(
    payload: Partial<Assessment> & {
      classId?: string;
      subjectId?: string;
      academicYearId?: string;
      termId?: string;
    },
    user: AuthenticatedUser,
  ) {
    return this.assessments.save(
      this.assessments.create({
        ...payload,
        organizationId: user.organizationId,
        class: payload.classId ? ({ id: payload.classId } as any) : undefined,
        subject: payload.subjectId ? ({ id: payload.subjectId } as any) : undefined,
        academicYear: payload.academicYearId ? ({ id: payload.academicYearId } as any) : undefined,
        term: payload.termId ? ({ id: payload.termId } as any) : undefined,
      }),
    );
  }

  async updateStatus(id: string, status: string, user: AuthenticatedUser) {
    const assessment = await this.assessments.findOne({
      where: { id, organizationId: user.organizationId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (assessment.isPublished && status !== 'Published') {
      throw new BadRequestException('Published assessments cannot be reopened');
    }

    assessment.status = status;
    assessment.isPublished = status === 'Published';
    await this.assessments.save(assessment);

    if (assessment.isPublished) {
      await this.results.calculateForAssessment(assessment.id, user.organizationId);
    }

    return assessment;
  }
}
